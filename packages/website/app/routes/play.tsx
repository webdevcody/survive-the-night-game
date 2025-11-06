import { useEffect, useRef, useState } from "react";
import { PredictionConfigPanel } from "./play/components/PredictionConfigPanel";

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

  useEffect(() => {
    // Mark as client-side after mount
    setIsClient(true);
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
      <PredictionConfigPanel />
    </div>
  );
}

export default function Play() {
  return <GameClientLoader />;
}
