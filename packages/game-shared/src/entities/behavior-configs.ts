import { ItemType } from "../util/inventory";
import { RecipeComponent } from "../util/recipes";

/**
 * Spawn configuration for items/weapons that can spawn randomly on the map
 */
export interface SpawnConfig {
  enabled: boolean;
  chance: number; // Spawn chance per tile (0.0 to 1.0)
}

/**
 * Merchant shop configuration for items/weapons that can be sold
 */
export interface MerchantConfig {
  enabled: boolean;
  price: number; // Price in coins
}

/**
 * Recipe configuration for items/weapons that can be crafted
 * Can either define recipe inline or reference a RecipeType
 */
export interface RecipeConfig {
  enabled: boolean;
  /**
   * Components required to craft this item
   * If not provided, will look up RecipeType class
   */
  components?: RecipeComponent[];
  /**
   * Reference to a RecipeType if recipe logic is complex
   * Takes precedence over components if both are provided
   */
  recipeType?: string;
}

/**
 * Shared behavior configurations that can be applied to both items and weapons
 */
export interface BehaviorConfigs {
  spawn?: SpawnConfig;
  merchant?: MerchantConfig;
  recipe?: RecipeConfig;
}
