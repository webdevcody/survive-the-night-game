import { InventoryItem } from "../inventory.js";
import {
  craftRecipe,
  Recipe,
  recipeCanBeCrafted,
  RecipeComponent,
  RecipeType,
} from "../recipes.js";

export class WallRecipe implements Recipe {
  public getType(): RecipeType {
    return RecipeType.Wall;
  }

  public canBeCrafted(inventory: InventoryItem[]): boolean {
    return recipeCanBeCrafted(this, inventory);
  }

  public components(): RecipeComponent[] {
    return [
      {
        type: "Wood",
      },
      {
        type: "Wood",
      },
      {
        type: "Wood",
      },
    ];
  }

  public craft(inventory: InventoryItem[]): InventoryItem[] {
    return craftRecipe(this, inventory);
  }

  public resultingComponent(): RecipeComponent {
    return {
      type: "Wall",
    };
  }
}
