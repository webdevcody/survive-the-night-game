import type { Route } from "./+types/home";
import { useEffect } from "react";
import { useRef } from "react";
import { GameClient } from "@survive-the-night/game-client";

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
  const clientRef = useRef<GameClient | null>(null);

  useEffect(() => {
    async function initClient(): Promise<void> {
      if (!canvasRef.current) {
        return;
      }

      clientRef.current = new GameClient(import.meta.env.VITE_WSS_URL, canvasRef.current);

      await clientRef.current.loadAssets();
      clientRef.current.start();
    }

    void initClient();

    return () => {
      clientRef.current?.unmount();
    };
  }, []);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <canvas ref={canvasRef} />
    </div>
  );
}
