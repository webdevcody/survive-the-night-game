"use client";

import { useEffect, useRef } from "react";
import { GameClient } from "@survive-the-night/game-client";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      new GameClient(process.env.NEXT_PUBLIC_WEBSOCKET_URL!, canvasRef.current);
    }
  }, []);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <canvas ref={canvasRef} />
    </div>
  );
}
