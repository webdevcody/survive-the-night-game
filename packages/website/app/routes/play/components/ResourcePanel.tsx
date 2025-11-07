import { useEffect, useState } from "react";

interface ResourcePanelProps {
  gameClient: any; // GameClient type
}

interface Resources {
  wood: number;
  cloth: number;
}

interface SpriteInfo {
  sheet: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ResourcePanel({ gameClient }: ResourcePanelProps) {
  const [resources, setResources] = useState<Resources>({ wood: 0, cloth: 0 });
  const [spriteSheets, setSpriteSheets] = useState<Record<string, string>>({});
  const [resourceSprites, setResourceSprites] = useState<{
    wood: SpriteInfo | null;
    cloth: SpriteInfo | null;
  }>({ wood: null, cloth: null });

  // Load sprite sheet URLs and sprite positions
  useEffect(() => {
    if (!gameClient) return;

    const loadSprites = () => {
      // Get sprite sheet URLs
      const sheets = gameClient.getSpriteSheets();
      setSpriteSheets(sheets);

      // Get sprite positions for wood and cloth
      const woodSprite = gameClient.getItemSpriteInfo("wood");
      const clothSprite = gameClient.getItemSpriteInfo("cloth");

      setResourceSprites({
        wood: woodSprite,
        cloth: clothSprite,
      });
    };

    // Load sprites after a short delay to ensure assets are loaded
    const timeout = setTimeout(loadSprites, 500);
    return () => clearTimeout(timeout);
  }, [gameClient]);

  // Poll game state for resources every 100ms
  useEffect(() => {
    if (!gameClient) return;

    const interval = setInterval(() => {
      try {
        const state = gameClient.getCraftingState();
        setResources(state.resources);
      } catch (error) {
        console.error("Failed to get resources:", error);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameClient]);

  if (!gameClient) {
    return null;
  }

  const woodSprite = resourceSprites.wood;
  const clothSprite = resourceSprites.cloth;

  return (
    <div className="fixed right-52 top-4 z-40 bg-black/90 border-2 border-amber-600/50 rounded px-2 py-1">
      <div className="flex items-center gap-4 text-white text-base">
        <div className="flex items-center gap-2">
          {woodSprite && spriteSheets[woodSprite.sheet] ? (
            <div
              className="inline-block"
              style={{
                width: `${woodSprite.width}px`,
                height: `${woodSprite.height}px`,
                backgroundImage: `url(${spriteSheets[woodSprite.sheet]})`,
                backgroundPosition: `-${woodSprite.x}px -${woodSprite.y}px`,
                backgroundRepeat: "no-repeat",
                imageRendering: "pixelated",
              }}
            />
          ) : (
            <span className="text-sm">🪵</span>
          )}
          <span className="font-bold tabular-nums">{resources.wood}</span>
        </div>
        <div className="flex items-center gap-2">
          {clothSprite && spriteSheets[clothSprite.sheet] ? (
            <div
              className="inline-block"
              style={{
                width: `${clothSprite.width}px`,
                height: `${clothSprite.height}px`,
                backgroundImage: `url(${spriteSheets[clothSprite.sheet]})`,
                backgroundPosition: `-${clothSprite.x}px -${clothSprite.y}px`,
                backgroundRepeat: "no-repeat",
                transform: "scale(2)",
                imageRendering: "pixelated",
              }}
            />
          ) : (
            <span className="text-sm">🧵</span>
          )}
          <span className="font-bold tabular-nums">{resources.cloth}</span>
        </div>
      </div>
    </div>
  );
}
