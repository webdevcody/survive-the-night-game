import { useEffect, useState, useCallback } from "react";
// Recipes are automatically loaded from item/weapon configs (recipe.enabled === true)
import { recipes, type Recipe, RecipeType } from "@shared/util/recipes";
import { cn } from "~/lib/utils";
import { type InventoryItem } from "@shared/util/inventory";

/**
 * Formats a name by replacing underscores with spaces and converting to title case
 */
const formatDisplayName = (name: string): string => {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

interface CraftingState {
  resources: {
    wood: number;
    cloth: number;
  };
  inventory: InventoryItem[];
  playerId: string | null;
}

interface SpriteInfo {
  sheet: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CraftingPanelProps {
  gameClient: any; // GameClient type
}

export function CraftingPanel({ gameClient }: CraftingPanelProps) {
  const [craftingState, setCraftingState] = useState<CraftingState>({
    resources: { wood: 0, cloth: 0 },
    inventory: [],
    playerId: null,
  });
  const [hoveredRecipe, setHoveredRecipe] = useState<RecipeType | null>(null);
  const [itemSprites, setItemSprites] = useState<Record<string, SpriteInfo>>({});
  const [spriteSheets, setSpriteSheets] = useState<Record<string, string>>({});

  // Load sprite sheet URLs and sprite positions
  useEffect(() => {
    if (!gameClient) return;

    const loadSprites = () => {
      // Get sprite sheet URLs
      const sheets = gameClient.getSpriteSheets();
      setSpriteSheets(sheets);

      // Get sprite positions for each recipe result
      const sprites: Record<string, SpriteInfo> = {};
      recipes.forEach((recipe) => {
        const resultType = recipe.resultingComponent().type;
        const spriteInfo = gameClient.getItemSpriteInfo(resultType);
        if (spriteInfo) {
          sprites[resultType] = spriteInfo;
        }
      });
      setItemSprites(sprites);
    };

    // Load sprites after a short delay to ensure assets are loaded
    const timeout = setTimeout(loadSprites, 500);
    return () => clearTimeout(timeout);
  }, [gameClient]);

  // Poll game state every 100ms
  useEffect(() => {
    if (!gameClient) return;

    const interval = setInterval(() => {
      try {
        const state = gameClient.getCraftingState();
        setCraftingState(state);
      } catch (error) {
        console.error("Failed to get crafting state:", error);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameClient]);

  const handleCraft = useCallback(
    (recipe: RecipeType) => {
      if (!gameClient) return;

      try {
        gameClient.craftRecipe(recipe);
      } catch (error) {
        console.error("Failed to craft recipe:", error);
      }
    },
    [gameClient]
  );

  const canCraftRecipe = useCallback(
    (recipe: Recipe): boolean => {
      try {
        return recipe.canBeCrafted(craftingState.inventory, craftingState.resources);
      } catch {
        return false;
      }
    },
    [craftingState]
  );

  const getResourceRequirements = (recipe: Recipe) => {
    const components = recipe.components();
    const requirements: { [key: string]: number } = {};

    components.forEach((component) => {
      const count = component.count || 1;
      if (requirements[component.type]) {
        requirements[component.type] += count;
      } else {
        requirements[component.type] = count;
      }
    });

    return requirements;
  };

  if (!gameClient) {
    return null;
  }

  return (
    <div className="fixed left-4 top-[120px] z-[5000]">
      {/* Vertical column of recipe cells */}
      <div className="flex flex-col gap-1">
        {recipes.map((recipe) => {
          const craftable = canCraftRecipe(recipe);
          const requirements = getResourceRequirements(recipe);
          const resultComponent = recipe.resultingComponent();
          const isHovered = hoveredRecipe === recipe.getType();
          const sprite = itemSprites[resultComponent.type];

          return (
            <div key={recipe.getType()} className="relative">
              <button
                onClick={() => handleCraft(recipe.getType())}
                onMouseEnter={() => setHoveredRecipe(recipe.getType())}
                onMouseLeave={() => setHoveredRecipe(null)}
                className={cn(
                  "w-14 h-14 border-2 transition-all relative overflow-hidden",
                  "hover:scale-110 active:scale-95 cursor-pointer",
                  craftable
                    ? "bg-green-900/70 border-green-600 hover:bg-green-800/80"
                    : "bg-gray-800/70 border-gray-700 opacity-60"
                )}
              >
                {sprite ? (
                  <div
                    className="w-full h-full flex items-center justify-center overflow-hidden"
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
                  <span className="text-white text-xs text-center block leading-[3.5rem]">
                    {resultComponent.type.charAt(0).toUpperCase()}
                  </span>
                )}

                {/* Corner indicator */}
                <div
                  className={cn(
                    "absolute top-0 right-0 w-2 h-2 rounded-bl",
                    craftable ? "bg-green-400" : "bg-gray-500"
                  )}
                />
              </button>

              {/* Hover tooltip - positioned to the right of the button */}
              {isHovered && (
                <div
                  className="absolute left-full ml-2 top-0 bg-black/95 border-2 border-amber-600 rounded p-2 w-44 pointer-events-none whitespace-nowrap"
                  style={{ zIndex: 99999 }}
                >
                  <div className="text-amber-200 font-bold text-sm mb-1 border-b border-amber-600/50 pb-1">
                    {formatDisplayName(resultComponent.type)}
                  </div>
                  <div className="text-xs text-gray-300 space-y-0.5">
                    {Object.entries(requirements).map(([itemType, count]) => {
                      const hasEnough =
                        itemType === "wood"
                          ? craftingState.resources.wood >= count
                          : itemType === "cloth"
                          ? craftingState.resources.cloth >= count
                          : (() => {
                              // For stackable items, check if we have enough count
                              const totalAvailable = craftingState.inventory
                                .filter((item) => item?.itemType === itemType)
                                .reduce((sum, item) => sum + (item?.state?.count || 1), 0);
                              return totalAvailable >= count;
                            })();

                      return (
                        <div
                          key={itemType}
                          className={cn(
                            "flex justify-between items-center",
                            hasEnough ? "text-green-400" : "text-red-400"
                          )}
                        >
                          <span>
                            {count}x {formatDisplayName(itemType)}
                          </span>
                          <span className="text-xs">
                            {itemType === "wood" && `(${craftingState.resources.wood})`}
                            {itemType === "cloth" && `(${craftingState.resources.cloth})`}
                            {itemType !== "wood" && itemType !== "cloth" && (
                              <>{hasEnough ? "✓" : "✗"}</>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
