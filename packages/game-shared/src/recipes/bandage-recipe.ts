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

export class BandageRecipe implements Recipe {
  public getType(): RecipeType {
    return RecipeType.Bandage;
  }

  public canBeCrafted(inventory: InventoryItem[], resources: PlayerResources): boolean {
    return recipeCanBeCrafted(this, inventory, resources);
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

  public craft(inventory: InventoryItem[], resources: PlayerResources): CraftingResult {
    return craftRecipe(this, inventory, resources);
  }

  public resultingComponent(): RecipeComponent {
    return {
      type: "bandage",
    };
  }
}
