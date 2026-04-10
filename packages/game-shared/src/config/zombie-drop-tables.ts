import type { ItemType } from "../util/inventory";

/** Weighted loot row; higher weight = more likely when a drop succeeds. */
export type ZombieDropTableEntry = { itemType: ItemType; weight: number };

/**
 * Full random drop pool (crates, drums, survivors, and baseline for zombie variants).
 * Verbatim move from game-server inventory ITEM_DROP_TABLE.
 */
export const LEGACY_RANDOM_DROP_TABLE: ZombieDropTableEntry[] = [
  { itemType: "wood", weight: 25 },
  { itemType: "cloth", weight: 25 },
  { itemType: "bandage", weight: 15 },
  { itemType: "pain_pills", weight: 10 },
  { itemType: "coin", weight: 10 },
  { itemType: "pistol_ammo", weight: 12 },
  { itemType: "shotgun_ammo", weight: 12 },
  { itemType: "arrow_ammo", weight: 12 },
  { itemType: "bow", weight: 10 },
  { itemType: "pistol", weight: 10 },
  { itemType: "shotgun", weight: 6 },
  { itemType: "knife", weight: 8 },
  { itemType: "throwing_knife", weight: 8 },
  { itemType: "wall", weight: 8 },
  { itemType: "torch", weight: 10 },
  { itemType: "miners_hat", weight: 8 },
  { itemType: "spikes", weight: 7 },
  { itemType: "grenade", weight: 5 },
  { itemType: "bolt_action_rifle", weight: 3 },
  { itemType: "ak47", weight: 2 },
  { itemType: "grenade_launcher", weight: 1.5 },
  { itemType: "flamethrower", weight: 1.5 },
  { itemType: "bolt_action_ammo", weight: 4 },
  { itemType: "ak47_ammo", weight: 4 },
  { itemType: "grenade_launcher_ammo", weight: 3 },
  { itemType: "flamethrower_ammo", weight: 3 },
  { itemType: "landmine", weight: 4 },
  { itemType: "sentry_gun", weight: 2 },
  { itemType: "gasoline", weight: 6 },
];

/** Basic zombie: only these four; pistol rare, ammo uncommon, coin/cloth common. */
export const NORMAL_ZOMBIE_DROP_TABLE: ZombieDropTableEntry[] = [
  { itemType: "cloth", weight: 25 },
  { itemType: "coin", weight: 25 },
  { itemType: "pistol_ammo", weight: 8 },
  { itemType: "pistol", weight: 2 },
];

export function scaleZombieDropWeights(
  table: ZombieDropTableEntry[],
  factors: Partial<Record<ItemType, number>>,
  defaultFactor = 1
): ZombieDropTableEntry[] {
  return table.map((e) => ({
    itemType: e.itemType,
    weight: e.weight * (factors[e.itemType] ?? defaultFactor),
  }));
}

const L = LEGACY_RANDOM_DROP_TABLE;

/** Distinct legacy-derived tables per zombie id (subset/reweight only). */
export const ZOMBIE_DROP_TABLE_BY_ID: Record<string, ZombieDropTableEntry[]> = {
  zombie: NORMAL_ZOMBIE_DROP_TABLE,
  big_zombie: scaleZombieDropWeights(L, {
    wood: 1.45,
    wall: 1.35,
    spikes: 1.35,
    bandage: 1.25,
    pain_pills: 1.15,
    shotgun: 1.2,
    coin: 0.75,
    cloth: 0.85,
    pistol: 0.65,
    bow: 0.7,
  }),
  fast_zombie: scaleZombieDropWeights(L, {
    coin: 1.35,
    cloth: 1.3,
    bandage: 1.15,
    pain_pills: 1.1,
    wood: 0.75,
    bolt_action_rifle: 0.45,
    ak47: 0.45,
    grenade_launcher: 0.45,
    flamethrower: 0.45,
    sentry_gun: 0.5,
  }),
  exploding_zombie: scaleZombieDropWeights(L, {
    gasoline: 1.5,
    grenade: 1.45,
    bandage: 1.2,
    pain_pills: 1.15,
    landmine: 1.25,
    wood: 0.65,
    bow: 0.65,
    miners_hat: 0.75,
  }),
  bat_zombie: scaleZombieDropWeights(L, {
    arrow_ammo: 1.5,
    bow: 1.45,
    throwing_knife: 1.2,
    wall: 0.75,
    shotgun: 0.8,
    landmine: 0.75,
  }),
  spitter_zombie: scaleZombieDropWeights(L, {
    pistol_ammo: 1.4,
    shotgun_ammo: 1.35,
    grenade_launcher_ammo: 1.35,
    grenade: 1.15,
    knife: 0.8,
    wood: 0.85,
    torch: 0.85,
  }),
  leaping_zombie: scaleZombieDropWeights(L, {
    knife: 1.5,
    throwing_knife: 1.45,
    spikes: 1.2,
    bandage: 1.1,
    pain_pills: 1.05,
    bow: 0.75,
    bolt_action_rifle: 0.85,
  }),
  grave_tyrant: scaleZombieDropWeights(L, {
    bolt_action_rifle: 1.6,
    bolt_action_ammo: 1.45,
    ak47: 1.35,
    ak47_ammo: 1.35,
    sentry_gun: 1.4,
    coin: 0.7,
    cloth: 0.75,
  }),
  charging_tyrant: scaleZombieDropWeights(L, {
    landmine: 1.55,
    grenade: 1.4,
    shotgun: 1.35,
    shotgun_ammo: 1.25,
    spikes: 1.2,
    bow: 0.65,
    arrow_ammo: 0.7,
  }),
  acid_flyer: scaleZombieDropWeights(L, {
    gasoline: 1.55,
    flamethrower: 1.45,
    flamethrower_ammo: 1.45,
    grenade_launcher_ammo: 1.2,
    wood: 0.7,
    wall: 0.75,
  }),
  splitter_boss: scaleZombieDropWeights(L, {
    ak47: 1.55,
    ak47_ammo: 1.45,
    shotgun_ammo: 1.35,
    pistol_ammo: 1.2,
    miners_hat: 0.75,
    torch: 0.8,
  }),
};
