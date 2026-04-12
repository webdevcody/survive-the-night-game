import { getProgressionPointsBudget } from "./experience-level";

export const ABILITY_IDS = [
  "sprint",
  "regenerate",
  "adrenaline",
  "stealth",
  "packRat",
  "hercules",
  "combatShield",
  "trackStar",
  "combatRoll",
  "brawler",
  "headShot",
  "aimForTheKnee",
  "detox",
  "lockPicking",
  "counterAttack",
  "sneak",
] as const;
export type AbilityId = (typeof ABILITY_IDS)[number];

export const ABILITY_SERIALIZED_FIELD_BY_ID: Record<AbilityId, string> = {
  sprint: "abilitySprint",
  regenerate: "abilityRegenerate",
  adrenaline: "abilityAdrenaline",
  stealth: "abilityStealth",
  packRat: "abilityPackRat",
  hercules: "abilityHercules",
  combatShield: "abilityCombatShield",
  trackStar: "abilityTrackStar",
  combatRoll: "abilityCombatRoll",
  brawler: "abilityBrawler",
  headShot: "abilityHeadShot",
  aimForTheKnee: "abilityAimForTheKnee",
  detox: "abilityDetox",
  lockPicking: "abilityLockPicking",
  counterAttack: "abilityCounterAttack",
  sneak: "abilitySneak",
};

export type AbilityDefinition = {
  label: string;
  description: string;
  iconPath: string;
  accentColor: string;
};

export const ABILITY_DEFINITIONS: Record<AbilityId, AbilityDefinition> = {
  sprint: {
    label: "Sprint",
    description: "Unlock sprinting while you still have stamina.",
    iconPath: "/ui/abilities/ability-sprint.png",
    accentColor: "#d9a44d",
  },
  regenerate: {
    label: "Regenerate",
    description: "Passively heal a small amount while alive.",
    iconPath: "/ui/abilities/ability-regenerate.png",
    accentColor: "#73c77a",
  },
  adrenaline: {
    label: "Adrenaline",
    description: "Move faster while below 20% health.",
    iconPath: "/ui/abilities/ability-adrenaline.png",
    accentColor: "#d55454",
  },
  stealth: {
    label: "Stealth",
    description: "Reduce the range where zombies notice you.",
    iconPath: "/ui/abilities/ability-stealth.png",
    accentColor: "#5aa27d",
  },
  packRat: {
    label: "Pack Rat",
    description: "Unlock 15 more bag slots.",
    iconPath: "/ui/abilities/ability-pack-rat.png",
    accentColor: "#b48749",
  },
  hercules: {
    label: "Hercules",
    description: "Unlock 15 more bag slots.",
    iconPath: "/ui/abilities/ability-hercules.png",
    accentColor: "#cf9350",
  },
  combatShield: {
    label: "Combat Shield",
    description: "Lets you equip a combat shield in your hands slot.",
    iconPath: "/ui/abilities/ability-combat-shield.png",
    accentColor: "#7d90d2",
  },
  trackStar: {
    label: "Track Star",
    description: "Gain max stamina, regen, and a movement boost.",
    iconPath: "/ui/abilities/ability-track-star.png",
    accentColor: "#7fb1ff",
  },
  combatRoll: {
    label: "Combat Roll",
    description: "Double-tap W, A, S, or D to roll in that direction (cooldown).",
    iconPath: "/ui/abilities/ability-combat-roll.png",
    accentColor: "#8dd3c7",
  },
  brawler: {
    label: "Brawler",
    description: "Fists deal bonus damage and extra knockback.",
    iconPath: "/ui/abilities/ability-brawler.png",
    accentColor: "#c9825a",
  },
  headShot: {
    label: "Head Shot",
    description: "Ranged hits have a 10% chance to deal +2 damage.",
    iconPath: "/ui/abilities/ability-head-shot.png",
    accentColor: "#c85353",
  },
  aimForTheKnee: {
    label: "Aim For The Knee",
    description: "Ranged hits can maim zombies and cut their speed in half.",
    iconPath: "/ui/abilities/ability-aim-for-the-knee.png",
    accentColor: "#9eb264",
  },
  detox: {
    label: "Detox",
    description: "Poison effects expire in half the usual time.",
    iconPath: "/ui/abilities/ability-detox.png",
    accentColor: "#66c29d",
  },
  lockPicking: {
    label: "Lock Picking",
    description: "Open locked crates that other survivors cannot.",
    iconPath: "/ui/abilities/ability-lock-picking.png",
    accentColor: "#ccb36d",
  },
  counterAttack: {
    label: "Counter Attack",
    description: "Melee attackers can take damage back when they hit you.",
    iconPath: "/ui/abilities/ability-counter-attack.png",
    accentColor: "#d27a6a",
  },
  sneak: {
    label: "Sneak",
    description: "Hold Ctrl to move slowly without aggroing zombies.",
    iconPath: "/ui/abilities/ability-sneak.png",
    accentColor: "#6a8d74",
  },
};

export function isAbilityId(value: string): value is AbilityId {
  return (ABILITY_IDS as readonly string[]).includes(value);
}

/** Max rank per ability node (single-rank unlocks for now). */
export const MAX_RANK_PER_ABILITY = 1;

export type AbilityAllocations = Partial<Record<AbilityId, number>>;

export function emptyAbilityAllocations(): Record<AbilityId, number> {
  return {
    sprint: 0,
    regenerate: 0,
    adrenaline: 0,
    stealth: 0,
    packRat: 0,
    hercules: 0,
    combatShield: 0,
    trackStar: 0,
    combatRoll: 0,
    brawler: 0,
    headShot: 0,
    aimForTheKnee: 0,
    detox: 0,
    lockPicking: 0,
    counterAttack: 0,
    sneak: 0,
  };
}

export function sumAbilityAllocations(allocations: AbilityAllocations): number {
  let total = 0;
  for (const id of ABILITY_IDS) {
    const value = allocations[id];
    if (typeof value === "number" && value > 0) {
      total += Math.floor(value);
    }
  }
  return total;
}

export function getMaxAbilityPointsFromTotalXp(totalXp: number): number {
  return getProgressionPointsBudget(Math.max(0, Math.floor(totalXp)));
}

/** UI layout hints (canvas pixels relative to abilities panel content area). */
export const ABILITY_TREE_NODES: Array<{
  id: AbilityId;
  label: string;
  x: number;
  y: number;
}> = [
  { id: "sprint", label: ABILITY_DEFINITIONS.sprint.label, x: 56, y: 56 },
  { id: "regenerate", label: ABILITY_DEFINITIONS.regenerate.label, x: 232, y: 56 },
  { id: "adrenaline", label: ABILITY_DEFINITIONS.adrenaline.label, x: 408, y: 56 },
  { id: "stealth", label: ABILITY_DEFINITIONS.stealth.label, x: 584, y: 56 },
  { id: "packRat", label: ABILITY_DEFINITIONS.packRat.label, x: 56, y: 212 },
  { id: "hercules", label: ABILITY_DEFINITIONS.hercules.label, x: 232, y: 212 },
  { id: "combatShield", label: ABILITY_DEFINITIONS.combatShield.label, x: 408, y: 212 },
  { id: "trackStar", label: ABILITY_DEFINITIONS.trackStar.label, x: 584, y: 212 },
  { id: "combatRoll", label: ABILITY_DEFINITIONS.combatRoll.label, x: 56, y: 368 },
  { id: "brawler", label: ABILITY_DEFINITIONS.brawler.label, x: 232, y: 368 },
  { id: "headShot", label: ABILITY_DEFINITIONS.headShot.label, x: 408, y: 368 },
  { id: "aimForTheKnee", label: ABILITY_DEFINITIONS.aimForTheKnee.label, x: 584, y: 368 },
  { id: "detox", label: ABILITY_DEFINITIONS.detox.label, x: 56, y: 524 },
  { id: "lockPicking", label: ABILITY_DEFINITIONS.lockPicking.label, x: 232, y: 524 },
  { id: "counterAttack", label: ABILITY_DEFINITIONS.counterAttack.label, x: 408, y: 524 },
  { id: "sneak", label: ABILITY_DEFINITIONS.sneak.label, x: 584, y: 524 },
];

/** Future: prerequisite edges. Empty for initial two-node tree. */
export const ABILITY_TREE_EDGES: Array<{ from: AbilityId; to: AbilityId }> = [];

/** Heal per second while alive when regenerate rank >= 1 */
export const REGENERATE_HEAL_PER_SECOND = 0.35;

// One-release compatibility aliases while the rename lands across packages.
export const SKILL_IDS = ABILITY_IDS;
export type SkillId = AbilityId;
export const MAX_RANK_PER_SKILL = MAX_RANK_PER_ABILITY;
export type SkillAllocations = AbilityAllocations;
export const SKILL_TREE_NODES = ABILITY_TREE_NODES;
export const SKILL_TREE_EDGES = ABILITY_TREE_EDGES;
export const emptySkillAllocations = emptyAbilityAllocations;
export const sumSkillAllocations = sumAbilityAllocations;
export const getMaxSkillPointsFromTotalXp = getMaxAbilityPointsFromTotalXp;
export const isSkillId = isAbilityId;
