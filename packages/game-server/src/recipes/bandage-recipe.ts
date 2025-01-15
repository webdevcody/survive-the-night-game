import { InventoryItem } from "@shared/geom/inventory";
import {
  Recipe,
  RecipeType,
  recipeCanBeCrafted,
  RecipeComponent,
  craftRecipe,
} from "@shared/geom/recipes";

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
        type: "cloth",
      },
      {
        type: "cloth",
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
      type: "bandage",
    };
  }
}
