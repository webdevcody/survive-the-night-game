/**
 * Sound Type encoding using sequential IDs.
 * Each sound type is assigned a unique sequential ID (0-255).
 * This allows encoding sound types as uint8 instead of strings.
 *
 * NOTE: These values must match the sound files in the client and
 * stay in sync with SOUND_TYPES_TO_MP3 in sound-manager.ts
 */

// All sound types (matching SOUND_TYPES_TO_MP3 values)
export const SoundTypes = {
  PISTOL: "pistol",
  PLAYER_HURT: "player_hurt",
  PICK_UP_ITEM: "pick_up_item",
  DROP_ITEM: "drop_item",
  PLAYER_DEATH: "player_death",
  ZOMBIE_DEATH: "zombie_death",
  ZOMBIE_HURT: "zombie_hurt",
  ZOMBIE_GROWL: "growl",
  SHOTGUN_FIRE: "shotgun_fire",
  ZOMBIE_ATTACKED: "zombie_bite",
  GUN_EMPTY: "gun_empty",
  KNIFE_ATTACK: "knife_swing",
  EXPLOSION: "explosion",
  COIN_PICKUP: "coin_pickup",
  LOOT: "loot",
  BOLT_ACTION_RIFLE: "bolt_action_rifle",
  AK47: "ak47",
  WALK: "walk",
  RUN: "run",
  REPAIR: "repair",
  HORN: "horn",
  CRAFT: "craft",
  BUILD: "build",
  MUSIC: "music",
  BATTLE: "battle",
  CAMPFIRE: "campfire",
} as const;

export type SoundType = (typeof SoundTypes)[keyof typeof SoundTypes];

// Sequential IDs for each sound type (0-255)
export const SOUND_TYPE_IDS: Record<string, number> = {
  [SoundTypes.PISTOL]: 0,
  [SoundTypes.PLAYER_HURT]: 1,
  [SoundTypes.PICK_UP_ITEM]: 2,
  [SoundTypes.DROP_ITEM]: 3,
  [SoundTypes.PLAYER_DEATH]: 4,
  [SoundTypes.ZOMBIE_DEATH]: 5,
  [SoundTypes.ZOMBIE_HURT]: 6,
  [SoundTypes.ZOMBIE_GROWL]: 7,
  [SoundTypes.SHOTGUN_FIRE]: 8,
  [SoundTypes.ZOMBIE_ATTACKED]: 9,
  [SoundTypes.GUN_EMPTY]: 10,
  [SoundTypes.KNIFE_ATTACK]: 11,
  [SoundTypes.EXPLOSION]: 12,
  [SoundTypes.COIN_PICKUP]: 13,
  [SoundTypes.LOOT]: 14,
  [SoundTypes.BOLT_ACTION_RIFLE]: 15,
  [SoundTypes.AK47]: 16,
  [SoundTypes.WALK]: 17,
  [SoundTypes.RUN]: 18,
  [SoundTypes.REPAIR]: 19,
  [SoundTypes.HORN]: 20,
  [SoundTypes.CRAFT]: 21,
  [SoundTypes.BUILD]: 22,
  [SoundTypes.MUSIC]: 23,
  [SoundTypes.BATTLE]: 24,
  [SoundTypes.CAMPFIRE]: 25,
} as const;

// Reverse lookup: ID -> sound type string
const ID_TO_SOUND_TYPE: Record<number, string> = {};
for (const [type, id] of Object.entries(SOUND_TYPE_IDS)) {
  ID_TO_SOUND_TYPE[id] = type;
}

/**
 * Encode a sound type string to a uint8 ID.
 * @param type The sound type string
 * @returns Encoded uint8 value (0-255)
 */
export function encodeSoundType(type: string): number {
  const id = SOUND_TYPE_IDS[type];
  if (id === undefined) {
    throw new Error(`Unknown sound type: ${type}`);
  }
  return id;
}

/**
 * Decode a uint8 ID to a sound type string.
 * @param encoded The encoded uint8 value
 * @returns The sound type string
 */
export function decodeSoundType(encoded: number): string {
  if (encoded < 0 || encoded > 255) {
    throw new Error(`Invalid encoded sound type: ${encoded} (must be 0-255)`);
  }

  const type = ID_TO_SOUND_TYPE[encoded];
  if (!type) {
    throw new Error(`No sound type found for ID: ${encoded}`);
  }

  return type;
}
