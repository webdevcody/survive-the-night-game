import { SpikeRecipe } from "@/recipes/spike-recipe";
import { BandageRecipe } from "../recipes/bandage-recipe";
import { WallRecipe } from "../recipes/wall-recipe";
import { ItemType, InventoryItem } from "./inventory";
import { TorchRecipe } from "@/recipes/torch-recipe";
import { SentryGunRecipe } from "@/recipes/sentry-gun-recipe";
import { getConfig } from "@/config";

export enum RecipeType {
  Bandage = "bandage",
  Wall = "wall",
  Spike = "spike",
  Torch = "torch",
  SentryGun = "sentry_gun",
}

export const recipes: Recipe[] = [
  new BandageRecipe(),
  new WallRecipe(),
  new SpikeRecipe(),
  new TorchRecipe(),
  new SentryGunRecipe(),
];

export interface RecipeComponent {
  type: ItemType;
  count?: number; // Optional count for stackable items (defaults to 1)
}

export interface PlayerResources {
  wood: number;
  cloth: number;
}

export interface CraftingResult {
  inventory: InventoryItem[];
  resources: PlayerResources;
  itemToDrop?: InventoryItem; // Item to drop if inventory was full
}

export interface Recipe {
  getType(): RecipeType;
  canBeCrafted: (inventory: InventoryItem[], resources: PlayerResources) => boolean;
  components: () => RecipeComponent[];
  craft: (
    inventory: InventoryItem[],
    resources: PlayerResources,
    maxInventorySlots?: number
  ) => CraftingResult;
  resultingComponent: () => RecipeComponent;
}

export function craftRecipe(
  recipe: Recipe,
  inventory: InventoryItem[],
  resources: PlayerResources
): CraftingResult {
  const newInventory: InventoryItem[] = [];
  const newResources = { ...resources };
  const components = recipe.components();
  const found: number[] = [];

  const maxInventorySlots = getConfig().player.MAX_INVENTORY_SLOTS;

  // Count how many of each resource we need
  const resourceNeeds = { wood: 0, cloth: 0 };
  for (const component of components) {
    if (component.type === "wood") {
      resourceNeeds.wood++;
    } else if (component.type === "cloth") {
      resourceNeeds.cloth++;
    }
  }

  // Check if we have enough resources
  if (resourceNeeds.wood > resources.wood || resourceNeeds.cloth > resources.cloth) {
    return { inventory, resources };
  }

  // Group components by type and count required amounts
  const componentNeeds: Map<ItemType, number> = new Map();
  for (const component of components) {
    if (component.type !== "wood" && component.type !== "cloth") {
      const currentCount = componentNeeds.get(component.type) || 0;
      componentNeeds.set(component.type, currentCount + (component.count || 1));
    }
  }

  // Track total consumption per item type
  const totalConsumed: Map<ItemType, number> = new Map();
  for (const [itemType] of componentNeeds) {
    totalConsumed.set(itemType, 0);
  }

  // Check inventory for non-resource items and consume required amounts
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (!item) continue; // Skip null/empty inventory slots

    const needed = componentNeeds.get(item.itemType);
    if (needed === undefined) {
      // This item is not needed for crafting, keep it
      newInventory.push(item);
      continue;
    }

    const alreadyConsumedTotal = totalConsumed.get(item.itemType) || 0;
    const remainingNeeded = needed - alreadyConsumedTotal;
    
    if (remainingNeeded <= 0) {
      // Already consumed enough of this item type, keep it
      newInventory.push(item);
      continue;
    }

    const itemCount = item.state?.count || 1;
    const toConsume = Math.min(itemCount, remainingNeeded);
    const newTotalConsumed = alreadyConsumedTotal + toConsume;
    totalConsumed.set(item.itemType, newTotalConsumed);

    // If we consumed less than the full stack, add the remainder to new inventory
    if (toConsume < itemCount) {
      newInventory.push({
        ...item,
        state: {
          ...item.state,
          count: itemCount - toConsume,
        },
      });
    }
    // If we consumed the full stack, don't add it to new inventory (it's consumed)
  }

  // Check if we consumed enough of each component type
  for (const [itemType, needed] of componentNeeds.entries()) {
    const consumed = totalConsumed.get(itemType) || 0;
    if (consumed < needed) {
      return { inventory, resources };
    }
  }

  // Deduct resources
  newResources.wood -= resourceNeeds.wood;
  newResources.cloth -= resourceNeeds.cloth;

  // Add the resulting item - check if it can stack with existing items
  const resulting = recipe.resultingComponent();
  const existingItemIndex = newInventory.findIndex((item) => item?.itemType === resulting.type);

  if (existingItemIndex !== -1) {
    // Stack with existing item
    const existingItem = newInventory[existingItemIndex];
    newInventory[existingItemIndex] = {
      ...existingItem,
      state: {
        ...existingItem.state,
        count: (existingItem.state?.count || 1) + 1,
      },
    };
    return { inventory: newInventory, resources: newResources };
  }

  // Check if inventory is full
  const currentItemCount = newInventory.filter((item) => item != null).length;
  if (currentItemCount >= maxInventorySlots) {
    // Inventory is full, return the item to be dropped
    return {
      inventory: newInventory,
      resources: newResources,
      itemToDrop: {
        itemType: resulting.type,
        state: { count: 1 },
      },
    };
  }

  // Add as new item with count
  newInventory.push({
    itemType: resulting.type,
    state: { count: 1 },
  });

  return { inventory: newInventory, resources: newResources };
}

export function recipeCanBeCrafted(
  recipe: Recipe,
  inventory: InventoryItem[],
  resources: PlayerResources
): boolean {
  const components = recipe.components();
  const found: number[] = [];

  // Count how many of each resource we need
  const resourceNeeds = { wood: 0, cloth: 0 };
  for (const component of components) {
    if (component.type === "wood") {
      resourceNeeds.wood++;
    } else if (component.type === "cloth") {
      resourceNeeds.cloth++;
    }
  }

  // Check if we have enough resources
  if (resourceNeeds.wood > resources.wood || resourceNeeds.cloth > resources.cloth) {
    return false;
  }

  // Group components by type and count required amounts
  const componentNeeds: Map<ItemType, number> = new Map();
  for (const component of components) {
    if (component.type !== "wood" && component.type !== "cloth") {
      const currentCount = componentNeeds.get(component.type) || 0;
      componentNeeds.set(component.type, currentCount + (component.count || 1));
    }
  }

  // Check inventory for non-resource items and verify we have enough
  const availableCounts: Map<ItemType, number> = new Map();
  for (const item of inventory) {
    if (!item) continue; // Skip null/empty inventory slots

    if (componentNeeds.has(item.itemType)) {
      const currentAvailable = availableCounts.get(item.itemType) || 0;
      const itemCount = item.state?.count || 1;
      availableCounts.set(item.itemType, currentAvailable + itemCount);
    }
  }

  // Check if we have enough of each component type
  for (const [itemType, needed] of componentNeeds.entries()) {
    const available = availableCounts.get(itemType) || 0;
    if (available < needed) {
      return false;
    }
  }

  return true;
}
