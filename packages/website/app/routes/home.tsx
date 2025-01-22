import type { Route } from "./+types/home";
import { useEffect } from "react";
import { useRef } from "react";
import { GameClient } from "@survive-the-night/game-client";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Survive the Night" },
    { name: "description", content: "by Web Dev Cody" },
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

  const zoomButtonClass =
    "w-7 h-7 text-md/none border-white rounded-full " +
    "first:border-t last:border-b transition " +
    "disabled:opacity-50 enabled:hover:bg-[#FFFFFF20]";

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <canvas ref={canvasRef} />
      <div className="fixed right-4 bottom-4 flex flex-col">
        <button
          className={zoomButtonClass}
          onClick={() => clientRef.current?.getZoomController().zoomIn()}
          type="button"
        >
          +
        </button>
        <button
          className={zoomButtonClass}
          onClick={() => clientRef.current?.getZoomController().zoomOut()}
          type="button"
        >
          -
        </button>
      </div>
    </div>
  );
}
