import { InventoryItem } from "../inventory";
import { craftRecipe, Recipe, recipeCanBeCrafted, RecipeComponent, RecipeType } from "../recipes";

export class BandageRecipe implements Recipe {
  public getType(): RecipeType {
    return RecipeType.Bandage;
  }

  public canBeCrafted(inventory: InventoryItem[]): boolean {
    return recipeCanBeCrafted(this, inventory);
  }

  public components(): RecipeComponent[] {
    return [
      {
        type: "Cloth",
      },
      {
        type: "Cloth",
      },
      {
        type: "Cloth",
      },
    ];
  }

  public craft(inventory: InventoryItem[]): InventoryItem[] {
    return craftRecipe(this, inventory);
  }

  public resultingComponent(): RecipeComponent {
    return {
      type: "Bandage",
    };
  }
}
