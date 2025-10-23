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

export interface Recipe {
  getType(): RecipeType;
  canBeCrafted: (inventory: InventoryItem[]) => boolean;
  components: () => RecipeComponent[];
  craft: (inventory: InventoryItem[]) => InventoryItem[];
  resultingComponent: () => RecipeComponent;
}

export function craftRecipe(recipe: Recipe, inventory: InventoryItem[]): InventoryItem[] {
  const newInventory: InventoryItem[] = [];
  const components = recipe.components();
  const found: number[] = [];

  for (const item of inventory) {
    const componentIdx = components.findIndex(
      (it, idx) => it.type === item.itemType && !found.includes(idx)
    );

    if (componentIdx === -1) {
      newInventory.push(item);
      continue;
    }

    found.push(componentIdx);
  }

  if (found.length !== components.length) {
    return inventory;
  }

  const resulting = recipe.resultingComponent();
  newInventory.push({ itemType: resulting.type });
  return newInventory;
}

export function recipeCanBeCrafted(recipe: Recipe, inventory: InventoryItem[]): boolean {
  const components = recipe.components();
  const found: number[] = [];

  for (const item of inventory) {
    const componentIdx = components.findIndex(
      (it, idx) => it.type === item.itemType && !found.includes(idx)
    );

    if (componentIdx === -1) {
      continue;
    }

    found.push(componentIdx);
  }

  return found.length === components.length;
}
