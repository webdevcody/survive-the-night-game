"use client";

import { useEffect, useRef } from "react";
import { GameClient } from "@survive-the-night/game-client";

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clientRef = useRef<GameClient | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      clientRef.current = new GameClient(process.env.NEXT_PUBLIC_WEBSOCKET_URL!, canvasRef.current);
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.unmount();
      }
    };
  }, []);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <canvas ref={canvasRef} />
    </div>
  );
}
