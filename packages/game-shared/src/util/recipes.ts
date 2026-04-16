import { getConfig } from "../config";
import { itemRegistry, resourceRegistry, weaponRegistry } from "../entities";
import type { CraftingStationId } from "./crafting-stations";
import type { ProfessionId } from "./professions";
import { PROFESSION_DEFINITIONS } from "./professions";
import { ItemType, InventoryItem, isWeapon } from "./inventory";
import type { EntityType } from "../types/entity";

export type RecipeType = string;
export type RecipeKind = "craft" | "scrap";

export interface RecipeComponent {
  type: ItemType;
  count?: number; // Optional count for stackable items (defaults to 1)
}

export interface CraftingResult {
  inventory: (InventoryItem | null)[];
  itemToDrop?: InventoryItem; // Item to drop if inventory was full
}

export interface Recipe {
  id: RecipeType;
  kind: RecipeKind;
  result: RecipeComponent;
  components: RecipeComponent[];
  profession: ProfessionId | null;
  unlockLevel: number;
  station: CraftingStationId | null;
  professionXp: number;
}

/**
 * Certain crafted items carry per-instance state and must never be collapsed into a shared stack.
 */
const NON_STACKING_CRAFT_RESULT_TYPES = new Set<ItemType>(["sign"]);

function createCraftResultItem(result: RecipeComponent): InventoryItem {
  const resultCount = result.count || 1;
  if (NON_STACKING_CRAFT_RESULT_TYPES.has(result.type) && resultCount === 1) {
    return { itemType: result.type };
  }
  return {
    itemType: result.type,
    state: { count: resultCount },
  };
}

export function craftRecipe(
  recipe: Recipe,
  inventory: (InventoryItem | null)[],
  maxInventorySlotsOverride?: number
): CraftingResult {
  const components = recipe.components;

  const maxInventorySlots =
    maxInventorySlotsOverride ?? getConfig().player.MAX_INVENTORY_SLOTS;

  // All components (wood, cloth, ammo, etc.) come from bag stacks
  const componentNeeds: Map<ItemType, number> = new Map();
  for (const component of components) {
    const currentCount = componentNeeds.get(component.type) || 0;
    componentNeeds.set(component.type, currentCount + (component.count || 1));
  }

  const totalConsumed: Map<ItemType, number> = new Map();
  for (const [itemType] of componentNeeds) {
    totalConsumed.set(itemType, 0);
  }

  const newInventory: InventoryItem[] = [];

  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (!item) continue;

    const needed = componentNeeds.get(item.itemType);
    if (needed === undefined) {
      newInventory.push(item);
      continue;
    }

    const alreadyConsumedTotal = totalConsumed.get(item.itemType) || 0;
    const remainingNeeded = needed - alreadyConsumedTotal;

    if (remainingNeeded <= 0) {
      newInventory.push(item);
      continue;
    }

    const itemCount = item.state?.count || 1;
    const toConsume = Math.min(itemCount, remainingNeeded);
    const newTotalConsumed = alreadyConsumedTotal + toConsume;
    totalConsumed.set(item.itemType, newTotalConsumed);

    if (toConsume < itemCount) {
      newInventory.push({
        ...item,
        state: {
          ...item.state,
          count: itemCount - toConsume,
        },
      });
    }
  }

  for (const [itemType, needed] of componentNeeds.entries()) {
    const consumed = totalConsumed.get(itemType) || 0;
    if (consumed < needed) {
      return { inventory };
    }
  }

  const resultCount = recipe.result.count || 1;
  const craftedResultItem = createCraftResultItem(recipe.result);
  const canMergeCraftResult = !NON_STACKING_CRAFT_RESULT_TYPES.has(recipe.result.type);

  if (canMergeCraftResult) {
    const existingItemIndex = newInventory.findIndex((item) => item?.itemType === recipe.result.type);

    if (existingItemIndex !== -1) {
      const existingItem = newInventory[existingItemIndex];
      newInventory[existingItemIndex] = {
        ...existingItem,
        state: {
          ...existingItem.state,
          count: (existingItem.state?.count || 1) + resultCount,
        },
      };
      return { inventory: newInventory };
    }
  }

  const currentItemCount = newInventory.filter((item) => item != null).length;
  if (currentItemCount >= maxInventorySlots) {
    return {
      inventory: newInventory,
      itemToDrop: craftedResultItem,
    };
  }

  newInventory.push(craftedResultItem);

  return { inventory: newInventory };
}

export function recipeCanBeCrafted(
  recipe: Recipe,
  inventory: (InventoryItem | null)[],
): boolean {
  const components = recipe.components;

  const componentNeeds: Map<ItemType, number> = new Map();
  for (const component of components) {
    const currentCount = componentNeeds.get(component.type) || 0;
    componentNeeds.set(component.type, currentCount + (component.count || 1));
  }

  const availableCounts: Map<ItemType, number> = new Map();
  for (const item of inventory) {
    if (!item) continue;

    if (componentNeeds.has(item.itemType)) {
      const currentAvailable = availableCounts.get(item.itemType) || 0;
      const itemCount = item.state?.count || 1;
      availableCounts.set(item.itemType, currentAvailable + itemCount);
    }
  }

  for (const [itemType, needed] of componentNeeds.entries()) {
    const available = availableCounts.get(itemType) || 0;
    if (available < needed) {
      return false;
    }
  }

  return true;
}

type ProfessionRecipeSeed = {
  profession: ProfessionId;
  unlockLevel: number;
  resultCount?: number;
  extraComponents?: RecipeComponent[];
};

const PROFESSION_COST_LADDER: Record<
  number,
  { primary: number; secondary: number; rare: number }
> = {
  1: { primary: 2, secondary: 1, rare: 0 },
  5: { primary: 3, secondary: 2, rare: 0 },
  9: { primary: 4, secondary: 3, rare: 1 },
  13: { primary: 5, secondary: 4, rare: 2 },
  17: { primary: 6, secondary: 4, rare: 3 },
  20: { primary: 8, secondary: 5, rare: 4 },
};

const PROFESSION_RECIPE_SEEDS: Record<string, ProfessionRecipeSeed> = {
  forager_wraps: { profession: "scavenging", unlockLevel: 1 },
  scout_pack: { profession: "scavenging", unlockLevel: 5 },
  tracker_boots: { profession: "scavenging", unlockLevel: 9 },
  dust_mask: { profession: "scavenging", unlockLevel: 13 },
  recon_poncho: { profession: "scavenging", unlockLevel: 17 },
  survival_satchel: { profession: "scavenging", unlockLevel: 20 },
  scrap_metal_bundle: { profession: "scrapping", unlockLevel: 1, resultCount: 1 },
  parts_bundle: { profession: "scrapping", unlockLevel: 5, resultCount: 1 },
  gun_parts_bundle: { profession: "scrapping", unlockLevel: 9, resultCount: 1 },
  electronics_bundle: { profession: "scrapping", unlockLevel: 13, resultCount: 1 },
  reclaimed_plating: { profession: "scrapping", unlockLevel: 17 },
  reclaimer_gloves: { profession: "scrapping", unlockLevel: 20 },
  torch: { profession: "crafting", unlockLevel: 1 },
  wall: { profession: "crafting", unlockLevel: 5 },
  spikes: { profession: "crafting", unlockLevel: 9 },
  bear_trap: { profession: "crafting", unlockLevel: 13 },
  crate: { profession: "crafting", unlockLevel: 17 },
  gallon_drum: { profession: "crafting", unlockLevel: 20 },
  pistol_ammo: { profession: "gunsmithing", unlockLevel: 1, resultCount: 8 },
  throwing_knife: {
    profession: "gunsmithing",
    unlockLevel: 5,
    resultCount: 5,
    extraComponents: [{ type: "knife", count: 1 }],
  },
  pistol: { profession: "gunsmithing", unlockLevel: 9 },
  shotgun_ammo: { profession: "gunsmithing", unlockLevel: 13, resultCount: 8 },
  shotgun: { profession: "gunsmithing", unlockLevel: 17 },
  bolt_action_rifle: { profession: "gunsmithing", unlockLevel: 20 },
  bandage: { profession: "chemistry", unlockLevel: 1 },
  pain_pills: { profession: "chemistry", unlockLevel: 5 },
  energy_drink: { profession: "chemistry", unlockLevel: 9 },
  molotov_cocktail: {
    profession: "chemistry",
    unlockLevel: 13,
    resultCount: 2,
    extraComponents: [{ type: "gasoline", count: 1 }],
  },
  adrenal_tonic: { profession: "chemistry", unlockLevel: 17 },
  combat_stim: { profession: "chemistry", unlockLevel: 20 },
  cloth_hood: { profession: "tailoring", unlockLevel: 1 },
  patchwork_vest: { profession: "tailoring", unlockLevel: 5 },
  stitched_pants: { profession: "tailoring", unlockLevel: 9 },
  survivor_boots: { profession: "tailoring", unlockLevel: 13 },
  forager_cloak: { profession: "tailoring", unlockLevel: 17 },
  reinforced_duster: { profession: "tailoring", unlockLevel: 20 },
  trail_mix: { profession: "cooking", unlockLevel: 1, resultCount: 2 },
  stew_can: { profession: "cooking", unlockLevel: 5 },
  seasoned_rations: { profession: "cooking", unlockLevel: 9 },
  protein_plate: { profession: "cooking", unlockLevel: 13 },
  hearty_stew: { profession: "cooking", unlockLevel: 17 },
  campfire_feast: { profession: "cooking", unlockLevel: 20 },
  miners_hat: { profession: "engineering", unlockLevel: 1 },
  landmine: { profession: "engineering", unlockLevel: 5 },
  grenade: { profession: "engineering", unlockLevel: 9 },
  grenade_launcher_ammo: { profession: "engineering", unlockLevel: 13, resultCount: 4 },
  flamethrower_ammo: { profession: "engineering", unlockLevel: 17, resultCount: 20 },
  sentry_gun: {
    profession: "engineering",
    unlockLevel: 20,
    extraComponents: [{ type: "pistol", count: 1 }],
  },
};

function mergeRecipeComponents(components: RecipeComponent[]): RecipeComponent[] {
  const counts = new Map<ItemType, number>();
  for (const component of components) {
    counts.set(component.type, (counts.get(component.type) ?? 0) + (component.count ?? 1));
  }
  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
}

function buildProfessionRecipeComponents(seed: ProfessionRecipeSeed): RecipeComponent[] {
  const palette = PROFESSION_DEFINITIONS[seed.profession].palette;
  const costs = PROFESSION_COST_LADDER[seed.unlockLevel];
  const components: RecipeComponent[] = [
    { type: palette[0], count: costs.primary },
    { type: palette[1], count: costs.secondary },
  ];
  if (costs.rare > 0) {
    components.push({ type: palette[2], count: costs.rare });
  }
  if (seed.extraComponents?.length) {
    components.push(...seed.extraComponents);
  }
  return mergeRecipeComponents(components);
}

function buildConfigRecipeMap(): Map<string, Recipe> {
  const out = new Map<string, Recipe>();
  const registerRecipe = (
    id: string,
    recipe:
      | {
          enabled: boolean;
          components?: RecipeComponent[];
          resultCount?: number;
          profession?: ProfessionId;
          unlockLevel?: number;
          station?: CraftingStationId;
          professionXp?: number;
        }
      | undefined,
  ) => {
    if (!recipe?.enabled || !recipe.components) {
      return;
    }
    out.set(id, {
      id,
      kind: "craft",
      result: { type: id as ItemType, count: recipe.resultCount ?? 1 },
      components: mergeRecipeComponents(recipe.components),
      profession: recipe.profession ?? null,
      unlockLevel: recipe.unlockLevel ?? 1,
      station: recipe.station ?? null,
      professionXp: recipe.professionXp ?? 0,
    });
  };

  itemRegistry.getAll().forEach((itemConfig) => registerRecipe(itemConfig.id, itemConfig.recipe));
  weaponRegistry.getAll().forEach((weaponConfig) => registerRecipe(weaponConfig.id, weaponConfig.recipe));
  resourceRegistry.getAll().forEach((resourceConfig) =>
    registerRecipe(resourceConfig.id, resourceConfig.recipe),
  );

  return out;
}

function buildProfessionRecipeMap(): Map<string, Recipe> {
  const out = new Map<string, Recipe>();
  for (const [recipeId, seed] of Object.entries(PROFESSION_RECIPE_SEEDS)) {
    const professionDef = PROFESSION_DEFINITIONS[seed.profession];
    out.set(recipeId, {
      id: recipeId,
      kind: "craft",
      result: { type: recipeId as ItemType, count: seed.resultCount ?? 1 },
      components: buildProfessionRecipeComponents(seed),
      profession: seed.profession,
      unlockLevel: seed.unlockLevel,
      station: professionDef.station,
      professionXp: 6 + seed.unlockLevel,
    });
  }
  return out;
}

function buildRecipes(): Recipe[] {
  const recipeMap = buildConfigRecipeMap();
  for (const [recipeId, recipe] of buildProfessionRecipeMap()) {
    recipeMap.set(recipeId, recipe);
  }
  return Array.from(recipeMap.values());
}

export const recipes: Recipe[] = buildRecipes();
const RECIPES_BY_ID = new Map(recipes.map((recipe) => [recipe.id, recipe] as const));

function buildCraftRecipeComponentEntityTypes(): ReadonlySet<EntityType> {
  const out = new Set<EntityType>();
  for (const recipe of recipes) {
    if (recipe.kind !== "craft") {
      continue;
    }
    for (const c of recipe.components) {
      out.add(c.type as EntityType);
    }
  }
  return out;
}

/** Item / weapon / resource types that appear as ingredients in at least one craft recipe. */
export const CRAFT_RECIPE_COMPONENT_ENTITY_TYPES: ReadonlySet<EntityType> =
  buildCraftRecipeComponentEntityTypes();

export function getCraftableItemIds(): string[] {
  return recipes.filter((recipe) => recipe.kind === "craft").map((recipe) => recipe.id);
}

export function getRecipeTypeForItem(itemId: string): RecipeType | null {
  return RECIPES_BY_ID.has(itemId) ? itemId : null;
}

export function getRecipeById(recipeId: string): Recipe | null {
  return RECIPES_BY_ID.get(recipeId) ?? null;
}

export function getRecipesForStation(stationId: CraftingStationId): Recipe[] {
  return recipes.filter((recipe) => recipe.station === stationId);
}

export function getProfessionRecipeIds(professionId: ProfessionId): string[] {
  return recipes
    .filter((recipe) => recipe.profession === professionId)
    .map((recipe) => recipe.id);
}

export function isRecipeUnlocked(
  recipe: Recipe,
  getProfessionLevel: (professionId: ProfessionId) => number,
): boolean {
  if (!recipe.profession) {
    return true;
  }
  return getProfessionLevel(recipe.profession) >= recipe.unlockLevel;
}

export function getScrapOutputsForItem(itemType: ItemType): {
  components: RecipeComponent[];
  hasRareOutput: boolean;
} | null {
  if (itemType === "gasoline" || itemType === "bandage" || itemType === "pain_pills" || itemType === "energy_drink" || itemType === "adrenal_tonic" || itemType === "combat_stim" || itemType === "molotov_cocktail") {
    return {
      components: [
        { type: "cloth", count: 1 },
        { type: "chemical_reagents", count: 1 },
      ],
      hasRareOutput: true,
    };
  }

  if (
    itemType === "wall" ||
    itemType === "spikes" ||
    itemType === "bear_trap" ||
    itemType === "torch" ||
    itemType === "crate" ||
    itemType === "gallon_drum" ||
    itemType === "landmine" ||
    itemType === "sentry_gun"
  ) {
    const industrial = itemType === "landmine" || itemType === "gallon_drum" || itemType === "sentry_gun";
    return {
      components: industrial
        ? [
            { type: "scrap_metal", count: 2 },
            { type: "mechanical_parts", count: 1 },
          ]
        : [{ type: "wood", count: 2 }],
      hasRareOutput: industrial,
    };
  }

  if (
    itemType === "miners_hat" ||
    itemType === "forager_wraps" ||
    itemType === "scout_pack" ||
    itemType === "tracker_boots" ||
    itemType === "dust_mask" ||
    itemType === "recon_poncho" ||
    itemType === "survival_satchel" ||
    itemType === "reclaimed_plating" ||
    itemType === "reclaimer_gloves" ||
    itemType === "cloth_hood" ||
    itemType === "patchwork_vest" ||
    itemType === "stitched_pants" ||
    itemType === "survivor_boots" ||
    itemType === "forager_cloak" ||
    itemType === "reinforced_duster" ||
    itemType === "leather_cap" ||
    itemType === "leather_jerkin" ||
    itemType === "leather_bracers" ||
    itemType === "leather_pants" ||
    itemType === "leather_boots" ||
    itemType === "leather_backpack"
  ) {
    return {
      components: [
        { type: "cloth", count: 1 },
        { type: "leather_strips", count: 1 },
      ],
      hasRareOutput: itemType === "miners_hat" || itemType === "reclaimed_plating",
    };
  }

  if (isWeapon(itemType)) {
    const outputs: RecipeComponent[] = [
      { type: "scrap_metal", count: 2 },
      { type: "gun_parts", count: 1 },
    ];
    const advancedFirearms = new Set([
      "shotgun",
      "bolt_action_rifle",
      "ak47",
      "grenade_launcher",
      "flamethrower",
      "pistol",
    ]);
    const hasElectronics = advancedFirearms.has(itemType);
    if (hasElectronics) {
      outputs.push({ type: "electronics", count: 1 });
    }
    return {
      components: outputs,
      hasRareOutput: hasElectronics || itemType !== "knife" && itemType !== "baseball_bat",
    };
  }

  return null;
}

export function getProfessionRecipeUnlockSeed(
  recipeId: string,
): ProfessionRecipeSeed | null {
  return PROFESSION_RECIPE_SEEDS[recipeId] ?? null;
}
