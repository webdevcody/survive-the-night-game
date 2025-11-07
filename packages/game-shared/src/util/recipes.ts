import { SpikeRecipe } from "@/recipes/spike-recipe";
import { BandageRecipe } from "../recipes/bandage-recipe";
import { WallRecipe } from "../recipes/wall-recipe";
import { ItemType, InventoryItem } from "./inventory";
import { TorchRecipe } from "@/recipes/torch-recipe";

export enum RecipeType {
  Bandage = "bandage",
  Wall = "wall",
  Spike = "spike",
  Torch = "torch",
}

export const recipes: Recipe[] = [
  new BandageRecipe(),
  new WallRecipe(),
  new SpikeRecipe(),
  new TorchRecipe(),
];

export interface RecipeComponent {
  type: ItemType;
}

export interface PlayerResources {
  wood: number;
  cloth: number;
}

export interface CraftingResult {
  inventory: InventoryItem[];
  resources: PlayerResources;
}

export interface Recipe {
  getType(): RecipeType;
  canBeCrafted: (inventory: InventoryItem[], resources: PlayerResources) => boolean;
  components: () => RecipeComponent[];
  craft: (inventory: InventoryItem[], resources: PlayerResources) => CraftingResult;
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

  // Check inventory for non-resource items
  for (const item of inventory) {
    const componentIdx = components.findIndex(
      (it, idx) =>
        it.type === item?.itemType &&
        it.type !== "wood" &&
        it.type !== "cloth" &&
        !found.includes(idx)
    );

    if (componentIdx === -1) {
      newInventory.push(item);
      continue;
    }

    found.push(componentIdx);
  }

  // Check if all non-resource components were found in inventory
  const nonResourceComponents = components.filter((c) => c.type !== "wood" && c.type !== "cloth");
  if (found.length !== nonResourceComponents.length) {
    return { inventory, resources };
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
  } else {
    // Add as new item with count
    newInventory.push({
      itemType: resulting.type,
      state: { count: 1 },
    });
  }

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

  // Check inventory for non-resource items
  for (const item of inventory) {
    if (!item) continue; // Skip null/empty inventory slots

    const componentIdx = components.findIndex(
      (it, idx) =>
        it.type === item.itemType &&
        it.type !== "wood" &&
        it.type !== "cloth" &&
        !found.includes(idx)
    );

    if (componentIdx === -1) {
      continue;
    }

    found.push(componentIdx);
  }

  // Check if all non-resource components were found
  const nonResourceComponents = components.filter((c) => c.type !== "wood" && c.type !== "cloth");
  return found.length === nonResourceComponents.length;
}
