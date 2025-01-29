import { InventoryItem } from "../util/inventory";
import {
  Recipe,
  RecipeType,
  recipeCanBeCrafted,
  RecipeComponent,
  craftRecipe,
} from "../util/recipes";

export class SpikeRecipe implements Recipe {
  public getType(): RecipeType {
    return RecipeType.Spike;
  }

  public canBeCrafted(inventory: InventoryItem[]): boolean {
    return recipeCanBeCrafted(this, inventory);
  }

  public components(): RecipeComponent[] {
    return [
      {
        type: "knife",
      },
      {
        type: "wood",
      },
      {
        type: "wood",
      },
    ];
  }

  public craft(inventory: InventoryItem[]): InventoryItem[] {
    return craftRecipe(this, inventory);
  }

  public resultingComponent(): RecipeComponent {
    return {
      type: "spikes",
    };
  }
}
