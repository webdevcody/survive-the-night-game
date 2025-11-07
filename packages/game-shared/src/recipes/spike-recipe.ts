import { InventoryItem } from "../util/inventory";
import {
  Recipe,
  RecipeType,
  recipeCanBeCrafted,
  RecipeComponent,
  craftRecipe,
  PlayerResources,
  CraftingResult,
} from "../util/recipes";

export class SpikeRecipe implements Recipe {
  public getType(): RecipeType {
    return RecipeType.Spike;
  }

  public canBeCrafted(inventory: InventoryItem[], resources: PlayerResources): boolean {
    return recipeCanBeCrafted(this, inventory, resources);
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

  public craft(inventory: InventoryItem[], resources: PlayerResources): CraftingResult {
    return craftRecipe(this, inventory, resources);
  }

  public resultingComponent(): RecipeComponent {
    return {
      type: "spikes",
    };
  }
}
