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

export class SentryGunRecipe implements Recipe {
  public getType(): RecipeType {
    return RecipeType.SentryGun;
  }

  public canBeCrafted(inventory: InventoryItem[], resources: PlayerResources): boolean {
    return recipeCanBeCrafted(this, inventory, resources);
  }

  public components(): RecipeComponent[] {
    return [
      {
        type: "pistol",
      },
      {
        type: "pistol_ammo",
        count: 5,
      },
      {
        type: "wood",
      },
      {
        type: "wood",
      },
      {
        type: "wood",
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
      type: "sentry_gun",
    };
  }
}
