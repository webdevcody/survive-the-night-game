import type { CraftingStationId } from "./crafting-stations";

export const PROFESSION_IDS = [
  "scavenging",
  "scrapping",
  "crafting",
  "gunsmithing",
  "chemistry",
  "tailoring",
  "cooking",
  "engineering",
] as const;

export type ProfessionId = (typeof PROFESSION_IDS)[number];

export const MAX_PROFESSION_LEVEL = 20;
const BASE_PROFESSION_XP_TO_LEVEL_2 = 10;
const PROFESSION_GROWTH = 1.22;

export type ProfessionProgress = Record<ProfessionId, number>;

export type ProfessionUnlock = {
  level: number;
  recipeId: string;
  label: string;
};

export type ProfessionDefinition = {
  id: ProfessionId;
  label: string;
  description: string;
  station: CraftingStationId;
  palette: readonly [string, string, string];
  unlocks: readonly ProfessionUnlock[];
};

export const PROFESSION_DEFINITIONS: Record<ProfessionId, ProfessionDefinition> = {
  scavenging: {
    id: "scavenging",
    label: "Scavenging",
    description: "Fieldcraft, salvage, and scavenged wear that improves survival runs.",
    station: "workbench",
    palette: ["cloth", "leather_strips", "electronics"],
    unlocks: [
      { level: 1, recipeId: "forager_wraps", label: "Forager Wraps" },
      { level: 5, recipeId: "scout_pack", label: "Scout Pack" },
      { level: 9, recipeId: "tracker_boots", label: "Tracker Boots" },
      { level: 13, recipeId: "dust_mask", label: "Dust Mask" },
      { level: 17, recipeId: "recon_poncho", label: "Recon Poncho" },
      { level: 20, recipeId: "survival_satchel", label: "Survival Satchel" },
    ],
  },
  scrapping: {
    id: "scrapping",
    label: "Scrapping",
    description: "Break gear down and rework reclaimed junk into useful bundles and kit.",
    station: "workbench",
    palette: ["scrap_metal", "cloth", "mechanical_parts"],
    unlocks: [
      { level: 1, recipeId: "scrap_metal_bundle", label: "Scrap Metal Bundle" },
      { level: 5, recipeId: "parts_bundle", label: "Parts Bundle" },
      { level: 9, recipeId: "gun_parts_bundle", label: "Gun Parts Bundle" },
      { level: 13, recipeId: "electronics_bundle", label: "Electronics Bundle" },
      { level: 17, recipeId: "reclaimed_plating", label: "Reclaimed Plating" },
      { level: 20, recipeId: "reclaimer_gloves", label: "Reclaimer Gloves" },
    ],
  },
  crafting: {
    id: "crafting",
    label: "Crafting",
    description: "Improvised structures and field-built tools for defense and storage.",
    station: "workbench",
    palette: ["wood", "cloth", "scrap_metal"],
    unlocks: [
      { level: 1, recipeId: "torch", label: "Torch" },
      { level: 5, recipeId: "wall", label: "Wall" },
      { level: 9, recipeId: "spikes", label: "Spikes" },
      { level: 13, recipeId: "bear_trap", label: "Bear Trap" },
      { level: 17, recipeId: "crate", label: "Crate" },
      { level: 20, recipeId: "gallon_drum", label: "Gallon Drum" },
    ],
  },
  gunsmithing: {
    id: "gunsmithing",
    label: "Gunsmithing",
    description: "Ammo, firearms, and weapon kits assembled at the forge.",
    station: "forge",
    palette: ["scrap_metal", "gun_parts", "electronics"],
    unlocks: [
      { level: 1, recipeId: "pistol_ammo", label: "Pistol Ammo" },
      { level: 5, recipeId: "throwing_knife", label: "Throwing Knife" },
      { level: 9, recipeId: "pistol", label: "Pistol" },
      { level: 13, recipeId: "shotgun_ammo", label: "Shotgun Ammo" },
      { level: 17, recipeId: "shotgun", label: "Shotgun" },
      { level: 20, recipeId: "bolt_action_rifle", label: "Bolt Action Rifle" },
    ],
  },
  chemistry: {
    id: "chemistry",
    label: "Chemistry",
    description: "Medicine, stimulants, and volatile compounds mixed with scarce reagents.",
    station: "chemistry_table",
    palette: ["chemical_reagents", "cloth", "gasoline"],
    unlocks: [
      { level: 1, recipeId: "bandage", label: "Bandage" },
      { level: 5, recipeId: "pain_pills", label: "Pain Pills" },
      { level: 9, recipeId: "energy_drink", label: "Energy Drink" },
      { level: 13, recipeId: "molotov_cocktail", label: "Molotov Cocktail" },
      { level: 17, recipeId: "adrenal_tonic", label: "Adrenal Tonic" },
      { level: 20, recipeId: "combat_stim", label: "Combat Stim" },
    ],
  },
  tailoring: {
    id: "tailoring",
    label: "Tailoring",
    description:
      "Patchwork armor and utility clothing from cloth and leather—including hides tanned from zombie skin.",
    station: "workbench",
    palette: ["cloth", "leather_strips", "chemical_reagents"],
    unlocks: [
      { level: 1, recipeId: "cloth_hood", label: "Cloth Hood" },
      { level: 1, recipeId: "leather", label: "Tanned Leather" },
      { level: 1, recipeId: "leather_cap", label: "Leather Cap" },
      { level: 1, recipeId: "leather_jerkin", label: "Leather Jerkin" },
      { level: 1, recipeId: "leather_bracers", label: "Leather Bracers" },
      { level: 1, recipeId: "leather_pants", label: "Leather Pants" },
      { level: 1, recipeId: "leather_boots", label: "Leather Boots" },
      { level: 1, recipeId: "leather_backpack", label: "Leather Backpack" },
      { level: 5, recipeId: "patchwork_vest", label: "Patchwork Vest" },
      { level: 9, recipeId: "stitched_pants", label: "Stitched Pants" },
      { level: 13, recipeId: "survivor_boots", label: "Survivor Boots" },
      { level: 17, recipeId: "forager_cloak", label: "Forager Cloak" },
      { level: 20, recipeId: "reinforced_duster", label: "Reinforced Duster" },
    ],
  },
  cooking: {
    id: "cooking",
    label: "Cooking",
    description: "Camp meals that turn scavenged food into stronger sustain.",
    station: "campfire",
    palette: ["canned_food", "wild_herbs", "clean_water"],
    unlocks: [
      { level: 1, recipeId: "trail_mix", label: "Trail Mix" },
      { level: 1, recipeId: "clean_water", label: "Boil Water" },
      { level: 5, recipeId: "stew_can", label: "Stew Can" },
      { level: 9, recipeId: "seasoned_rations", label: "Seasoned Rations" },
      { level: 13, recipeId: "protein_plate", label: "Protein Plate" },
      { level: 17, recipeId: "hearty_stew", label: "Hearty Stew" },
      { level: 20, recipeId: "campfire_feast", label: "Campfire Feast" },
    ],
  },
  engineering: {
    id: "engineering",
    label: "Engineering",
    description: "Heavy traps, launchers, and powered defenses assembled from precision parts.",
    station: "forge",
    palette: ["scrap_metal", "mechanical_parts", "electronics"],
    unlocks: [
      { level: 1, recipeId: "miners_hat", label: "Miner's Hat" },
      { level: 5, recipeId: "landmine", label: "Landmine" },
      { level: 9, recipeId: "grenade", label: "Grenade" },
      { level: 13, recipeId: "grenade_launcher_ammo", label: "Grenade Launcher Ammo" },
      { level: 17, recipeId: "flamethrower_ammo", label: "Flamethrower Ammo" },
      { level: 20, recipeId: "sentry_gun", label: "Sentry Gun" },
    ],
  },
};

export function isProfessionId(value: string): value is ProfessionId {
  return (PROFESSION_IDS as readonly string[]).includes(value);
}

export function emptyProfessionProgress(): ProfessionProgress {
  return {
    scavenging: 0,
    scrapping: 0,
    crafting: 0,
    gunsmithing: 0,
    chemistry: 0,
    tailoring: 0,
    cooking: 0,
    engineering: 0,
  };
}

export function normalizeProfessionProgress(raw: unknown): ProfessionProgress {
  const out = emptyProfessionProgress();
  if (!raw || typeof raw !== "object") {
    return out;
  }
  const source = raw as Record<string, unknown>;
  for (const id of PROFESSION_IDS) {
    const value = source[id];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      out[id] = Math.max(0, Math.floor(value));
    }
  }
  return out;
}

export function getProfessionXpToAdvanceFromLevel(level: number): number {
  if (level < 1 || !Number.isFinite(level)) {
    return BASE_PROFESSION_XP_TO_LEVEL_2;
  }
  const safeLevel = Math.max(1, Math.min(MAX_PROFESSION_LEVEL, Math.floor(level)));
  return Math.max(
    1,
    Math.round(BASE_PROFESSION_XP_TO_LEVEL_2 * Math.pow(PROFESSION_GROWTH, safeLevel - 1)),
  );
}

export function cumulativeProfessionXpToReachLevel(targetLevel: number): number {
  if (targetLevel <= 1) {
    return 0;
  }
  let total = 0;
  for (let level = 1; level < targetLevel; level++) {
    total += getProfessionXpToAdvanceFromLevel(level);
  }
  return total;
}

export function getProfessionLevelFromXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = xp;
  while (level < MAX_PROFESSION_LEVEL) {
    const nextCost = getProfessionXpToAdvanceFromLevel(level);
    if (remaining < nextCost) {
      break;
    }
    remaining -= nextCost;
    level++;
  }
  return level;
}

export function getProfessionProgress(totalXp: number): {
  level: number;
  totalXp: number;
  currentXpInLevel: number;
  xpToNextLevel: number;
  unlockedRecipes: readonly ProfessionUnlock[];
  nextUnlock: ProfessionUnlock | null;
  isMaxLevel: boolean;
} {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = xp;
  while (level < MAX_PROFESSION_LEVEL) {
    const nextCost = getProfessionXpToAdvanceFromLevel(level);
    if (remaining < nextCost) {
      break;
    }
    remaining -= nextCost;
    level++;
  }
  return {
    level,
    totalXp: xp,
    currentXpInLevel: remaining,
    xpToNextLevel: level >= MAX_PROFESSION_LEVEL ? 0 : getProfessionXpToAdvanceFromLevel(level),
    unlockedRecipes: [],
    nextUnlock: null,
    isMaxLevel: level >= MAX_PROFESSION_LEVEL,
  };
}

export function getProfessionDetails(
  professionId: ProfessionId,
  progress: ProfessionProgress,
): {
  level: number;
  totalXp: number;
  currentXpInLevel: number;
  xpToNextLevel: number;
  unlockedRecipes: readonly ProfessionUnlock[];
  nextUnlock: ProfessionUnlock | null;
  isMaxLevel: boolean;
} {
  const base = getProfessionProgress(progress[professionId] ?? 0);
  const unlocks = PROFESSION_DEFINITIONS[professionId].unlocks.filter(
    (unlock) => unlock.level <= base.level,
  );
  const nextUnlock =
    PROFESSION_DEFINITIONS[professionId].unlocks.find((unlock) => unlock.level > base.level) ??
    null;
  return {
    ...base,
    unlockedRecipes: unlocks,
    nextUnlock,
  };
}

export function getProfessionLabel(professionId: ProfessionId): string {
  return PROFESSION_DEFINITIONS[professionId].label;
}
