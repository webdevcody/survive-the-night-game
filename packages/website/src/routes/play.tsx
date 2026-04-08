import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { PredictionConfigPanel } from "./play/-components/PredictionConfigPanel";
import { InstructionPanel } from "./play/-components/InstructionPanel";
import { SpawnPanel } from "./play/-components/SpawnPanel";
import { NameChangePanel } from "./play/-components/NameChangePanel";
import { CharacterColorPanel } from "./play/-components/CharacterColorPanel";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { getGameAuthToken } from "~/fn/game-auth";
import { authClient } from "~/lib/auth-client";
import { Link } from "@tanstack/react-router";

type GameAuthPhase = "idle" | "loading" | "ok" | "missing";

// Extend window type for game auth token
declare global {
  interface Window {
    __gameAuthToken?: string | null;
  }
}

export const Route = createFileRoute("/play")({
  component: Play,
});

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
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [gameAuthPhase, setGameAuthPhase] = useState<GameAuthPhase>("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSpawnPanel, setShowSpawnPanel] = useState(false);
  const [showNameChangePanel, setShowNameChangePanel] = useState(false);
  const [showCharacterColorPanel, setShowCharacterColorPanel] = useState(false);
  const [gameClient, setGameClient] = useState<any>(null);
  const [savedDisplayName, setSavedDisplayName] = useState<string>("");
  const [currentPlayerName, setCurrentPlayerName] = useState<string>("");
  const [currentPlayerColor, setCurrentPlayerColor] = useState<string>("none");
  const gameControlsToggleRef = useRef<HTMLSpanElement>(null);

  const handleLeaveGame = () => {
    // Clean up game client before leaving
    if (sceneManagerRef.current) {
      sceneManagerRef.current.destroy();
      delete (window as any).__sceneManager;
    }
    navigate({ to: "/" });
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isClient) return;
    const savedName = localStorage.getItem("displayName");
    if (savedName) {
      setSavedDisplayName(savedName);
    }
    const savedColor = localStorage.getItem("playerColor");
    if (savedColor) {
      setCurrentPlayerColor(savedColor);
    }
  }, [isClient]);

  useEffect(() => {
    if (!sessionPending && !session) {
      window.location.href = "/sign-in?redirect=/play";
    }
  }, [session, sessionPending]);

  useEffect(() => {
    if (sessionPending || !session) return;

    let cancelled = false;
    setGameAuthPhase("loading");

    getGameAuthToken()
      .then(({ token, displayName }) => {
        if (cancelled) return;
        window.__gameAuthToken = token;
        if (displayName) {
          localStorage.setItem("displayName", displayName);
          setSavedDisplayName(displayName);
        }
        if (!token) {
          setGameAuthPhase("missing");
        } else {
          setGameAuthPhase("ok");
        }
      })
      .catch(() => {
        if (!cancelled) setGameAuthPhase("missing");
      });

    return () => {
      cancelled = true;
    };
  }, [session, sessionPending]);

  // Poll for game client once scene manager is loaded
  useEffect(() => {
    if (!isClient || gameAuthPhase !== "ok") return;

    const pollGameClient = setInterval(() => {
      if (!sceneManagerRef.current) return;

      const currentScene = sceneManagerRef.current.getCurrentScene();

      if (currentScene && typeof currentScene.getGameClient === "function") {
        const client = currentScene.getGameClient();
        if (client) {
          setGameClient(client);
          clearInterval(pollGameClient);
        }
      }
    }, 500);

    return () => clearInterval(pollGameClient);
  }, [isClient, gameAuthPhase]);

  // Poll for current player name and color updates
  useEffect(() => {
    if (!gameClient || !isClient) return;

    const updatePlayerInfo = () => {
      const player = gameClient.getMyPlayer?.();
      if (player) {
        const name = player.getDisplayName?.();
        if (name) {
          setCurrentPlayerName(name);
        }
        const color = player.getPlayerColor?.();
        if (color) {
          setCurrentPlayerColor(color);
        }
      }
    };

    // Update immediately
    updatePlayerInfo();

    // Poll for updates every 500ms
    const interval = setInterval(updatePlayerInfo, 500);
    return () => clearInterval(interval);
  }, [gameClient, isClient]);

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
        // Close character color panel if open
        if (showCharacterColorPanel) {
          setShowCharacterColorPanel(false);
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
      if (isInputField || showNameChangePanel || showCharacterColorPanel) {
        return;
      }

      // Don't close panels if user is chatting (chat handles ESC itself)
      if (gameClient && gameClient.isChatting && gameClient.isChatting()) {
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true); // Use capture phase
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [gameClient, showInstructions, showSpawnPanel, showNameChangePanel, showCharacterColorPanel]);

  useEffect(() => {
    if (!isClient || gameAuthPhase !== "ok" || !canvasRef.current) {
      return;
    }

    // @ts-ignore
    import("@survive-the-night/game-client/scenes").then(({ SceneManager, LoadingScene }) => {
      if (!canvasRef.current) {
        return;
      }

      sceneManagerRef.current = new SceneManager(canvasRef.current);

      (window as any).__sceneManager = sceneManagerRef.current;

      sceneManagerRef.current.switchScene(LoadingScene);
    });

    return () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.destroy();
        delete (window as any).__sceneManager;
      }
    };
  }, [isClient, gameAuthPhase]);

  if (sessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (gameAuthPhase === "idle" || gameAuthPhase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (gameAuthPhase === "missing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
        <h1 className="text-xl font-semibold">Game login is not available</h1>
        <p className="max-w-md text-muted-foreground">
          The server could not issue a game session token. This usually means{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">GAME_SERVER_API_KEY</code> is
          not set in the website environment, or it does not match the game server&apos;s key. Set
          the same secret in both services and reload.
        </p>
        <Link to="/" className="text-primary underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex justify-center items-center h-screen bg-black">
      <canvas ref={canvasRef} />

      {/* Top left controls - Game menu, Info button and Config panel */}
      <div className="fixed left-4 top-4 z-[10000] flex items-start gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
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
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
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
            <DropdownMenuItem onClick={() => setShowCharacterColorPanel(true)}>
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
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="21.17" y1="8" x2="12" y2="8" />
                  <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                  <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
                </svg>
                <span>Change Character</span>
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
          </DropdownMenuContent>
        </DropdownMenu>
        <span ref={gameControlsToggleRef} className="inline-flex">
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
        </span>
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
        outsideClickIgnoreRef={gameControlsToggleRef}
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

      {/* Character Color Panel */}
      <CharacterColorPanel
        isOpen={showCharacterColorPanel}
        onClose={() => setShowCharacterColorPanel(false)}
        currentColor={currentPlayerColor as any}
        onColorChange={(newColor) => {
          // Update local state immediately for UI feedback
          setCurrentPlayerColor(newColor);
          // Send to server
          if (gameClient?.getSocketManager?.()) {
            gameClient.getSocketManager().sendPlayerColor(newColor);
          }
        }}
      />

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

function Play() {
  return <GameClientLoader />;
}
