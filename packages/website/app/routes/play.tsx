import type { Route } from "./+types/home";
import { useEffect } from "react";
import { useRef } from "react";
import { SceneManager, LoadingScene } from "@survive-the-night/game-client/scenes";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Survive the Night Game" },
    {
      name: "description",
      content:
        "An online multiplayer game where you must survive the night against hordes of zombies.  Build bases with your friends, collect weapons, and craft items to see how long you'll last.",
    },
  ];
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  useEffect(() => {
    async function initScenes(): Promise<void> {
      if (!canvasRef.current) {
        return;
      }

      // Create scene manager
      sceneManagerRef.current = new SceneManager(canvasRef.current);

      // Store reference globally for scene transitions
      (window as any).__sceneManager = sceneManagerRef.current;

      // Start with loading scene (it will handle name entry if needed)
      await sceneManagerRef.current.switchScene(LoadingScene);
    }

    void initScenes();

    return () => {
      sceneManagerRef.current?.destroy();
      delete (window as any).__sceneManager;
    };
  }, []);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <canvas ref={canvasRef} />
    </div>
  );
}
