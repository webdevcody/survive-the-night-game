import { useState, useEffect, useMemo } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { SPAWNABLE_ENTITY_TYPES, Zombies } from "@survive-the-night/game-shared/constants";
import { isWeapon } from "@survive-the-night/game-shared/util/inventory";
import { itemRegistry } from "@survive-the-night/game-shared/entities/item-registry";

interface SpawnPanelProps {
  gameClient: any; // GameClient type
  isOpen: boolean;
  onToggle: () => void;
}

interface SpriteInfo {
  sheet: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GroupedEntities {
  weapons: string[];
  items: string[];
  zombies: string[];
  ammo: string[];
}

export function SpawnPanel({ gameClient, isOpen, onToggle }: SpawnPanelProps) {
  const [itemSprites, setItemSprites] = useState<Record<string, SpriteInfo>>({});
  const [spriteSheets, setSpriteSheets] = useState<Record<string, string>>({});

  // Load sprite sheet URLs and sprite positions
  useEffect(() => {
    if (!gameClient || !isOpen) return;

    const loadSprites = () => {
      // Get sprite sheet URLs
      const sheets = gameClient.getSpriteSheets();
      setSpriteSheets(sheets);

      // Get sprite positions for each spawnable entity
      const spawnableItems = [...SPAWNABLE_ENTITY_TYPES];
      const sprites: Record<string, SpriteInfo> = {};
      spawnableItems.forEach((entityType) => {
        const spriteInfo = gameClient.getItemSpriteInfo(entityType);
        if (spriteInfo) {
          sprites[entityType] = spriteInfo;
        }
      });
      setItemSprites(sprites);
    };

    // Load sprites after a short delay to ensure assets are loaded
    const timeout = setTimeout(loadSprites, 100);
    return () => clearTimeout(timeout);
  }, [gameClient, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onToggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onToggle]);

  const handleSpawnItem = (entityName: string) => {
    if (!gameClient) return;

    try {
      // Send spawn command through chat system
      const socketManager = gameClient.getSocketManager();
      if (socketManager && typeof socketManager.sendChatMessage === "function") {
        socketManager.sendChatMessage(`/spawn ${entityName}`);
      } else {
        console.error("Socket manager not available or sendChatMessage method not found");
      }
    } catch (error) {
      console.error("Failed to spawn item:", error);
    }
  };

  const formatEntityName = (name: string) => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Group entities into categories
  const groupedEntities = useMemo((): GroupedEntities => {
    const spawnableItems = [...SPAWNABLE_ENTITY_TYPES];
    const zombiesSet = new Set(Zombies);
    const grouped: GroupedEntities = { weapons: [], items: [], zombies: [], ammo: [] };

    spawnableItems.forEach((entityType) => {
      // Check if it's a zombie
      if (zombiesSet.has(entityType)) {
        grouped.zombies.push(entityType);
      } else if (isWeapon(entityType)) {
        // Check if it's a weapon
        grouped.weapons.push(entityType);
      } else {
        // Check if it's ammo
        const itemConfig = itemRegistry.get(entityType);
        if (itemConfig?.category === "ammo") {
          grouped.ammo.push(entityType);
        } else {
          // Everything else (items)
          grouped.items.push(entityType);
        }
      }
    });

    // Sort each category alphabetically
    grouped.weapons.sort();
    grouped.items.sort();
    grouped.zombies.sort();
    grouped.ammo.sort();

    return grouped;
  }, []);

  const renderEntityGrid = (entities: string[], sectionTitle: string) => {
    if (entities.length === 0) return null;

    return (
      <div className="mb-6">
        {/* Section Header */}
        <div className="mb-3 pb-2 border-b border-purple-500/30">
          <h3 className="text-purple-300 text-sm font-semibold uppercase">{sectionTitle}</h3>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-5 gap-2">
          {entities.map((entityType) => {
            const sprite = itemSprites[entityType];
            return (
              <button
                key={entityType}
                onClick={() => handleSpawnItem(entityType)}
                className={cn(
                  "relative w-full border-2 transition-all",
                  "bg-gray-800/70 border-purple-500/50 hover:bg-purple-800/50 hover:border-purple-400",
                  "hover:scale-105 active:scale-95 cursor-pointer overflow-hidden",
                  "flex flex-col items-center justify-center p-2 gap-1"
                )}
                title={formatEntityName(entityType)}
              >
                {/* Sprite */}
                <div className="flex items-center justify-center h-16">
                  {sprite && spriteSheets[sprite.sheet] ? (
                    <div
                      className="flex items-center justify-center"
                      style={{
                        imageRendering: "pixelated",
                      }}
                    >
                      <div
                        style={{
                          width: `${sprite.width}px`,
                          height: `${sprite.height}px`,
                          backgroundImage: `url(${spriteSheets[sprite.sheet]})`,
                          backgroundPosition: `-${sprite.x}px -${sprite.y}px`,
                          backgroundRepeat: "no-repeat",
                          imageRendering: "pixelated",
                          transform: "scale(3)",
                          transformOrigin: "center",
                        }}
                      />
                    </div>
                  ) : (
                    <span className="text-white text-xs text-center">
                      {entityType.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Item Name */}
                <span className="text-white text-xs text-center leading-tight line-clamp-2">
                  {formatEntityName(entityType)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Spawn Panel */}
      <div className="fixed inset-0 z-50 flex items-start justify-end pt-20 pr-4 bg-black/30" onClick={onToggle}>
        <div className="bg-black/90 border-2 border-purple-500 rounded-lg p-4 w-[600px] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-500/50">
            <h2 className="text-white text-xl font-bold">Spawn Items</h2>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              ✕
            </Button>
          </div>

          {/* Items Grid */}
          <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {renderEntityGrid(groupedEntities.weapons, "Weapons")}
            {renderEntityGrid(groupedEntities.items, "Items")}
            {renderEntityGrid(groupedEntities.zombies, "Zombies")}
            {renderEntityGrid(groupedEntities.ammo, "Ammo")}
          </div>

          {/* Info */}
          <div className="mt-4 pt-3 border-t border-purple-500/50">
            <p className="text-gray-400 text-xs text-center">
              Click an item to spawn it near your player
            </p>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.7);
        }
      `}</style>
    </>
  );
}
