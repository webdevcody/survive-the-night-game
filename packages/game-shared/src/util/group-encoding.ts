/**
 * Group encoding using sequential IDs.
 * Each group type is assigned a unique sequential ID (0-255).
 * This allows encoding group types as uint8 instead of strings.
 */

// All group types
export const Groups = {
  FRIENDLY: "friendly",
  ENEMY: "enemy",
} as const;

export type Group = (typeof Groups)[keyof typeof Groups];

// Sequential IDs for each group type (0-255)
export const GROUP_IDS: Record<Group, number> = {
  [Groups.FRIENDLY]: 0,
  [Groups.ENEMY]: 1,
} as const;

// Reverse lookup: ID -> group type string
const ID_TO_GROUP: Record<number, Group> = {
  0: Groups.FRIENDLY,
  1: Groups.ENEMY,
};

/**
 * Encode a group type string to a uint8 ID.
 * @param group The group type string
 * @returns Encoded uint8 value (0-255)
 */
export function encodeGroup(group: Group): number {
  const id = GROUP_IDS[group];
  if (id === undefined) {
    throw new Error(`Unknown group type: ${group}`);
  }
  return id;
}

/**
 * Decode a uint8 ID to a group type string.
 * @param encoded The encoded uint8 value
 * @returns The group type string
 */
export function decodeGroup(encoded: number): Group {
  if (encoded < 0 || encoded > 255) {
    throw new Error(`Invalid encoded group type: ${encoded} (must be 0-255)`);
  }

  const group = ID_TO_GROUP[encoded];
  if (!group) {
    throw new Error(`No group type found for ID: ${encoded}`);
  }

  return group;
}
