/**
 * Interactable Text encoding using sequential IDs.
 * Each interactable text string is assigned a unique sequential ID (0-255).
 * This allows encoding interactable display names as uint8 instead of strings.
 *
 * When adding new interactable text, add it to the InteractableTexts object
 * and the INTERACTABLE_TEXT_IDS map.
 */

// All interactable text strings
export const InteractableTexts = {
  // Item display names
  LANDMINE: "landmine",
  MINERS_HAT: "miners hat",
  SENTRY_GUN: "sentry gun",
  TORCH: "torch",
  BEAR_TRAP: "bear trap",
  REARM_BEAR_TRAP: "rearm bear trap",
  ESCAPE_BEAR_TRAP: "escape bear trap",
  WOOD: "wood",
  FORTIFIED_WALL: "fortified wall",
  IMPROVED_SENTRY_GUN: "improved sentry gun",
  ENERGY_DRINK: "energy drink",
  CLOTH: "cloth",
  SEARCH: "search",
  REPAIR: "repair",
  REINFORCED_WALL: "reinforced wall",
  RESCUE: "rescue",
  LOOT: "loot",
  ADVANCED_SENTRY_GUN: "advanced sentry gun",
  BUY: "buy",
  BANDAGE: "bandage",
  REINFORCED_SPIKES: "reinforced spikes",
  SPIKES: "spikes",
  WALL: "wall",
  GASOLINE: "gasoline",
  DEADLY_SPIKES: "deadly spikes",
  CRATE: "crate",
  GALLON_DRUM: "gallon drum",
  COIN: "coin",
  // Weapon display names (weapon keys with underscores, used directly by Weapon class)
  KNIFE: "knife",
  BASEBALL_BAT: "baseball_bat",
  PISTOL: "pistol",
  SHOTGUN: "shotgun",
  BOLT_ACTION_RIFLE: "bolt_action_rifle",
  AK47: "ak47",
  GRENADE_LAUNCHER: "grenade_launcher",
  FLAMETHROWER: "flamethrower",
  BOW: "bow",
  GRENADE: "grenade",
  MOLOTOV_COCKTAIL: "molotov_cocktail",
  THROWING_KNIFE: "throwing_knife",
  // Ammo display names (exact strings used by stackable items)
  PISTOL_AMMO: "pistol ammo",
  SHOTGUN_AMMO: "shotgun ammo",
  BOLT_ACTION_AMMO: "bolt action ammo",
  AK47_AMMO: "AK-47 ammo",
  GRENADE_LAUNCHER_AMMO: "Grenade launcher ammo",
  FLAMETHROWER_AMMO: "flamethrower ammo",
  ARROW: "arrow",
  // Environment/special
  TREE: "tree",
  CAR: "car",
  SURVIVOR: "survivor",
  MERCHANT: "merchant",
  // Additional level-based items
  WALL_LEVEL_2: "wall level 2",
  WALL_LEVEL_3: "wall level 3",
  SPIKES_LEVEL_2: "spikes level 2",
  SPIKES_LEVEL_3: "spikes level 3",
  SENTRY_GUN_LEVEL_2: "sentry gun level 2",
  SENTRY_GUN_LEVEL_3: "sentry gun level 3",
  BEAR_TRAP_LEVEL_2: "bear trap",
} as const;

export type InteractableText = (typeof InteractableTexts)[keyof typeof InteractableTexts];

// Sequential IDs for each interactable text (0-255)
export const INTERACTABLE_TEXT_IDS: Record<string, number> = {};

// Build IDs dynamically from InteractableTexts
const allTexts = Object.values(InteractableTexts).sort();
allTexts.forEach((text, index) => {
  INTERACTABLE_TEXT_IDS[text] = index;
});

// Reverse lookup: ID -> interactable text string
const ID_TO_INTERACTABLE_TEXT: Record<number, string> = {};
for (const [text, id] of Object.entries(INTERACTABLE_TEXT_IDS)) {
  ID_TO_INTERACTABLE_TEXT[id] = text;
}

/**
 * Encode an interactable text string to a uint8 ID.
 * @param text The interactable text string
 * @returns Encoded uint8 value (0-255)
 */
export function encodeInteractableText(text: string): number {
  const id = INTERACTABLE_TEXT_IDS[text];
  if (id === undefined) {
    throw new Error(`Unknown interactable text: ${text}`);
  }
  return id;
}

/**
 * Decode a uint8 ID to an interactable text string.
 * @param encoded The encoded uint8 value
 * @returns The interactable text string
 */
export function decodeInteractableText(encoded: number): string {
  if (encoded < 0 || encoded > 255) {
    throw new Error(`Invalid encoded interactable text: ${encoded} (must be 0-255)`);
  }

  const text = ID_TO_INTERACTABLE_TEXT[encoded];
  if (!text) {
    throw new Error(`No interactable text found for ID: ${encoded}`);
  }

  return text;
}
