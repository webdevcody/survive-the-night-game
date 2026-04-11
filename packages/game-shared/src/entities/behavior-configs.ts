import { RecipeComponent } from "../util/recipes";
import type { ProfessionId } from "../util/professions";
import type { CraftingStationId } from "../util/crafting-stations";

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
  buyable?: boolean; // If true, item appears in the buy menu (defaults to enabled value)
  stackSize?: number; // Number of items required to sell (and received when buying). Defaults to 1 for non-stackable items.
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
  /**
   * Number of items created when crafting (defaults to 1)
   */
  resultCount?: number;
  /** Profession associated with this recipe when it is surfaced in the station UI. */
  profession?: ProfessionId;
  /** Minimum profession level required to unlock this recipe. */
  unlockLevel?: number;
  /** Required station for this recipe. */
  station?: CraftingStationId;
  /** Profession XP granted on successful craft. */
  professionXp?: number;
}

/**
 * Shared behavior configurations that can be applied to both items and weapons
 */
export interface BehaviorConfigs {
  spawn?: SpawnConfig;
  merchant?: MerchantConfig;
  recipe?: RecipeConfig;
  /** Respawn delay for authored map item fixtures (spawns layer); overrides default when set. */
  fixtureRespawnMs?: number;
}
