import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { PredictionConfigPanel } from "./play/components/PredictionConfigPanel";
import { InstructionPanel } from "./play/components/InstructionPanel";
import { CraftingPanel } from "./play/components/CraftingPanel";
import { SpawnPanel } from "./play/components/SpawnPanel";
import { NameChangePanel } from "./play/components/NameChangePanel";
import { Button } from "~/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { getKeybindStore } from "@shared/config/keybind-store";
import type { KeyBindConfig } from "@shared/config/keybinds";

export function meta() {
  return [
    { title: "Survive the Night Game" },
    {
      name: "description",
      content:
        "An online multiplayer game where you must survive the night against hordes of zombies.  Build bases with your friends, collect weapons, and craft items to see how long you'll last.",
    },
  ];
}

// Client-only component that dynamically imports game client code
function GameClientLoader() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSpawnPanel, setShowSpawnPanel] = useState(false);
  const [showNameChangePanel, setShowNameChangePanel] = useState(false);
  const [gameClient, setGameClient] = useState<any>(null);
  const [savedDisplayName, setSavedDisplayName] = useState<string>("");
  const [currentPlayerName, setCurrentPlayerName] = useState<string>("");

  const [keybinds, setkeybinds] = useState<KeyBindConfig>(() => {
    if (typeof window !== "undefined") {
      return getKeybindStore().getKeybinds();
    }
    // Fallback for SSR
    return {
      moveUp: "KeyW",
      moveDown: "KeyS",
      moveLeft: "KeyA",
      moveRight: "KeyD",
      interact: "KeyE",
      drop: "KeyG",
      quickHeal: "KeyH",
      teleport: "KeyC",
      splitDrop: "KeyX",
      weaponsHud: "KeyF",
      quickSwitch: "KeyQ",
      sprint: "ShiftLeft",
      fire: "Space",
      toggleInstructions: "KeyI",
      toggleMute: "KeyN",
      playerList: "Tab",
      escape: "Escape",
      chat: "KeyY",
    };
  });

  // Subscribe to keybind changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const keybindStore = getKeybindStore();
    const unsubscribe = keybindStore.subscribe((newKeybinds) => {
      setkeybinds(newKeybinds);
    });
    
    return unsubscribe;
  }, []);

  const handleUpdateKeyBinds = (changes: Partial<KeyBindConfig>) => {
    if (typeof window !== "undefined") {
      const keybindStore = getKeybindStore();
      keybindStore.updateKeybinds(changes);
      // State will be updated via subscription
    }
  };

  const handleLeaveGame = () => {
    // Clean up game client before leaving
    if (sceneManagerRef.current) {
      sceneManagerRef.current.destroy();
      delete (window as any).__sceneManager;
    }
    navigate("/");
  };

  useEffect(() => {
    // Mark as client-side after mount
    setIsClient(true);
    // Load saved display name from localStorage (client-side only)
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("displayName");
      if (savedName) {
        setSavedDisplayName(savedName);
      }
    }
  }, []);

  // Poll for game client once scene manager is loaded
  useEffect(() => {
    if (!isClient) return;

    const pollGameClient = setInterval(() => {
      if (!sceneManagerRef.current) return;

      const currentScene = sceneManagerRef.current.getCurrentScene();
      console.log("Polling for game client, current scene:", currentScene?.constructor?.name);

      if (currentScene && typeof currentScene.getGameClient === "function") {
        const client = currentScene.getGameClient();
        if (client) {
          console.log("Game client found!", client);
          setGameClient(client);
          clearInterval(pollGameClient);
        }
      }
    }, 500);

    return () => clearInterval(pollGameClient);
  }, [isClient]);

  // Poll for current player name updates
  useEffect(() => {
    if (!gameClient || !isClient) return;

    const updatePlayerName = () => {
      const player = gameClient.getMyPlayer?.();
      if (player) {
        const name = player.getDisplayName?.();
        if (name) {
          setCurrentPlayerName(name);
        }
      }
    };

    // Update immediately
    updatePlayerName();

    // Poll for updates every 500ms
    const interval = setInterval(updatePlayerName, 500);
    return () => clearInterval(interval);
  }, [gameClient, isClient]);

  // Handle I key for toggling instructions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't process if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        showNameChangePanel
      ) {
        return;
      }

      // Don't toggle instructions if user is chatting
      if (gameClient && gameClient.isChatting && gameClient.isChatting()) {
        return;
      }

      // Don't toggle instructions if user is typing username
      if (gameClient && (e.key === "i" || e.key === "I")) {
        setShowInstructions((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameClient, showNameChangePanel]);

  // Handle ESC key to close any open panels (but not toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't process if user is typing in an input field (except ESC which should still work)
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // ESC can still close panels even from input fields
      if (e.key === "Escape") {
        // Close name change panel if open (highest priority)
        if (showNameChangePanel) {
          setShowNameChangePanel(false);
          e.stopPropagation();
          return;
        }
        // Close instructions panel if open
        if (showInstructions) {
          setShowInstructions(false);
          return;
        }
        // Close spawn panel if open
        if (showSpawnPanel) {
          setShowSpawnPanel(false);
          return;
        }
      }

      // For all other keys, don't process if user is typing in an input field
      if (isInputField || showNameChangePanel) {
        return;
      }

      // Don't close panels if user is chatting (chat handles ESC itself)
      if (gameClient && gameClient.isChatting && gameClient.isChatting()) {
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true); // Use capture phase
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [gameClient, showInstructions, showSpawnPanel, showNameChangePanel]);

  useEffect(() => {
    if (!isClient || !canvasRef.current) {
      return;
    }

    // Dynamically import game client code only on client-side
    import("@survive-the-night/game-client/scenes").then(({ SceneManager, LoadingScene }) => {
      if (!canvasRef.current) {
        return;
      }

      // Create scene manager
      sceneManagerRef.current = new SceneManager(canvasRef.current);

      // Store reference globally for scene transitions
      (window as any).__sceneManager = sceneManagerRef.current;

      // Start with loading scene (it will handle name entry if needed)
      sceneManagerRef.current.switchScene(LoadingScene);
    });

    return () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.destroy();
        delete (window as any).__sceneManager;
      }
    };
  }, [isClient]);

  return (
    <div className="relative flex justify-center items-center h-screen bg-black">
      <canvas ref={canvasRef} />

      {/* Top left controls - Game menu, Info button and Config panel */}
      <div className="fixed left-4 top-4 z-[10000] flex items-start gap-2">
        <DropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="bg-gray-800 text-white hover:bg-gray-700"
              title="Game Options"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </Button>
          }
          align="left"
        >
          <DropdownMenuItem onClick={() => setShowNameChangePanel(true)}>
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              <span>Change Name</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLeaveGame}>
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Leave Game</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowInstructions((prev) => !prev)}
          className="bg-gray-800 text-white hover:bg-gray-700"
          title="Game Controls (I)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </Button>
        {import.meta.env.VITE_LOCAL === "true" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSpawnPanel(!showSpawnPanel)}
              className="bg-purple-600 text-white hover:bg-purple-700 text-2xl"
              title="Spawn Items Panel"
            >
              🎁
            </Button>
            <PredictionConfigPanel />
          </>
        )}
      </div>

      {/* Instruction Panel Modal */}
      <InstructionPanel
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        keybinds={keybinds}
        onUpdateKeybinds={handleUpdateKeyBinds}
      />

      {/* Name Change Panel */}
      <NameChangePanel
        isOpen={showNameChangePanel}
        onClose={() => setShowNameChangePanel(false)}
        currentName={currentPlayerName || savedDisplayName || ""}
        onNameChange={(newName) => {
          // Update local state immediately for UI feedback
          setSavedDisplayName(newName);
          // Send to server
          if (gameClient?.getSocketManager?.()) {
            gameClient.getSocketManager().sendDisplayName(newName);
          }
        }}
      />

      {/* Crafting Panel */}
      {gameClient && <CraftingPanel gameClient={gameClient} />}

      {/* Spawn Panel (Local only) */}
      {import.meta.env.VITE_LOCAL === "true" && (
        <SpawnPanel
          gameClient={gameClient}
          isOpen={showSpawnPanel}
          onToggle={() => setShowSpawnPanel(!showSpawnPanel)}
        />
      )}
    </div>
  );
}

export default function Play() {
  return <GameClientLoader />;
}
