import { InventoryItem } from "../util/inventory";
import {
  Recipe,
  RecipeType,
  recipeCanBeCrafted,
  RecipeComponent,
  craftRecipe,
} from "../util/recipes";

export class TorchRecipe implements Recipe {
  public getType(): RecipeType {
    return RecipeType.Torch;
  }

  public canBeCrafted(inventory: InventoryItem[]): boolean {
    return recipeCanBeCrafted(this, inventory);
  }

  public components(): RecipeComponent[] {
    return [
      {
        type: "wood",
      },
      {
        type: "cloth",
      },
    ];
  }

  public craft(inventory: InventoryItem[]): InventoryItem[] {
    return craftRecipe(this, inventory);
  }

  public resultingComponent(): RecipeComponent {
    return {
      type: "torch",
    };
  }
}
