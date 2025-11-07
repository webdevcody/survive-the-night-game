import { useEffect, useRef, useState } from "react";
import { PredictionConfigPanel } from "./play/components/PredictionConfigPanel";
import { InstructionPanel } from "./play/components/InstructionPanel";
import { CraftingPanel } from "./play/components/CraftingPanel";
import { SpawnPanel } from "./play/components/SpawnPanel";
import { ResourcePanel } from "./play/components/ResourcePanel";
import { Button } from "~/components/ui/button";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSpawnPanel, setShowSpawnPanel] = useState(false);
  const [gameClient, setGameClient] = useState<any>(null);

  useEffect(() => {
    // Mark as client-side after mount
    setIsClient(true);
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

  // Handle ESC and I keys for toggling instructions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "i" || e.key === "I") {
        setShowInstructions((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    <div className="relative flex justify-center items-center h-screen bg-gray-900">
      <canvas ref={canvasRef} />

      {/* Top left controls - Settings button and Config panel */}
      <div className="fixed left-4 top-4 z-50 flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowInstructions(true)}
          className="bg-gray-800 text-white hover:bg-gray-700 text-2xl"
          title="Settings (ESC or I)"
        >
          ⚙️
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
      />

      {/* Resource Panel */}
      {gameClient && <ResourcePanel gameClient={gameClient} />}

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
