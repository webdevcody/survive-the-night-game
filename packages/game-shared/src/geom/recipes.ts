import { BandageRecipe } from "@server/recipes/bandage-recipe";
import { WallRecipe } from "@server/recipes/wall-recipe";
import { InventoryItem, ItemType } from "./inventory";

export enum RecipeType {
  Bandage = "bandage",
  Wall = "wall",
}

export const recipes: Recipe[] = [new BandageRecipe(), new WallRecipe()];

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
      (it, idx) => it.type === item.key && !found.includes(idx)
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
  newInventory.push({ key: resulting.type });
  return newInventory;
}

export function recipeCanBeCrafted(recipe: Recipe, inventory: InventoryItem[]): boolean {
  const components = recipe.components();
  const found: number[] = [];

  for (const item of inventory) {
    const componentIdx = components.findIndex(
      (it, idx) => it.type === item.key && !found.includes(idx)
    );

    if (componentIdx === -1) {
      continue;
    }

    found.push(componentIdx);
  }

  return found.length === components.length;
}
