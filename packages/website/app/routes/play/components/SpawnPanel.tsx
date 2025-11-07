import { useState, useEffect } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

interface SpawnPanelProps {
  gameClient: any; // GameClient type
  isOpen: boolean;
  onToggle: () => void;
}

// Import spawnable entity types from shared constants
const SPAWNABLE_ITEMS = [
  // Zombies
  "zombie",
  "big_zombie",
  "fast_zombie",
  "exploding_zombie",
  "bat_zombie",
  "spitter_zombie",
  "leaping_zombie",

  // Resources
  "tree",
  "cloth",
  "gasoline",
  "coin",

  // Structures
  "wall",
  "spikes",
  "fire",
  "torch",
  "landmine",

  // Items
  "bandage",
  "knife",
  "grenade",
  "fire_extinguisher",

  // Weapons
  "pistol",
  "shotgun",
  "bolt_action_rifle",
  "ak47",
  "grenade_launcher",
  "flamethrower",

  // Ammo
  "pistol_ammo",
  "shotgun_ammo",
  "bolt_action_ammo",
  "ak47_ammo",
  "grenade_launcher_ammo",
  "flamethrower_ammo",
].sort();

// Categorize items
const ITEM_CATEGORIES = {
  Zombies: [
    "zombie",
    "big_zombie",
    "fast_zombie",
    "exploding_zombie",
    "bat_zombie",
    "spitter_zombie",
    "leaping_zombie",
  ],
  Resources: ["tree", "cloth", "gasoline", "coin"],
  Structures: ["wall", "spikes", "fire", "torch", "landmine"],
  Items: ["bandage", "knife", "grenade", "fire_extinguisher"],
  Weapons: [
    "pistol",
    "shotgun",
    "bolt_action_rifle",
    "ak47",
    "grenade_launcher",
    "flamethrower",
  ],
  Ammo: [
    "pistol_ammo",
    "shotgun_ammo",
    "bolt_action_ammo",
    "ak47_ammo",
    "grenade_launcher_ammo",
    "flamethrower_ammo",
  ],
};

export function SpawnPanel({ gameClient, isOpen, onToggle }: SpawnPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

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

  const getFilteredItems = () => {
    if (selectedCategory === "All") {
      return SPAWNABLE_ITEMS;
    }
    return ITEM_CATEGORIES[selectedCategory as keyof typeof ITEM_CATEGORIES] || [];
  };

  const formatEntityName = (name: string) => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Spawn Panel */}
      <div className="fixed inset-0 z-50 flex items-start justify-end pt-20 pr-4 bg-black/30" onClick={onToggle}>
        <div className="bg-black/90 border-2 border-purple-500 rounded-lg p-4 w-80 max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-500/50">
            <h2 className="text-white text-xl font-bold">Spawn Items</h2>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              ✕
            </Button>
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("All")}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium transition-all",
                  selectedCategory === "All"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                )}
              >
                All
              </button>
              {Object.keys(ITEM_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm font-medium transition-all",
                    selectedCategory === category
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className="overflow-y-auto flex-1 space-y-2 pr-2 custom-scrollbar">
            {getFilteredItems().map((item) => (
              <button
                key={item}
                onClick={() => handleSpawnItem(item)}
                className={cn(
                  "w-full p-3 rounded-md border-2 transition-all text-left",
                  "bg-purple-900/30 border-purple-500/50 hover:bg-purple-800/50 hover:border-purple-400",
                  "hover:scale-105 active:scale-95 cursor-pointer"
                )}
              >
                <span className="text-white font-medium">{formatEntityName(item)}</span>
                <span className="text-gray-400 text-xs block mt-1">{item}</span>
              </button>
            ))}
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
