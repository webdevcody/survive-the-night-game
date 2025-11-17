import { ExtensionTypes } from "./extension-types";

/**
 * Extension type encoding using sequential IDs.
 * Each extension type is assigned a unique sequential ID (0-255).
 * This allows encoding extension types as uint8 instead of uint32.
 */

// Sequential IDs for each extension type (0-255)
export const EXTENSION_TYPE_IDS: Record<string, number> = {
  [ExtensionTypes.POSITIONABLE]: 0,
  [ExtensionTypes.COLLIDABLE]: 1,
  [ExtensionTypes.CONSUMABLE]: 2,
  [ExtensionTypes.DESTRUCTIBLE]: 3,
  [ExtensionTypes.INTERACTIVE]: 4,
  [ExtensionTypes.TRIGGERABLE]: 5,
  [ExtensionTypes.UPDATABLE]: 6,
  [ExtensionTypes.TRIGGER_COOLDOWN_ATTACKER]: 7,
  [ExtensionTypes.EXPIRABLE]: 8,
  [ExtensionTypes.INVENTORY]: 9,
  [ExtensionTypes.IGNITABLE]: 10,
  [ExtensionTypes.MOVABLE]: 11,
  [ExtensionTypes.STATIC]: 12,
  [ExtensionTypes.COMBUSTIBLE]: 13,
  [ExtensionTypes.ILLUMINATED]: 14,
  [ExtensionTypes.CARRYABLE]: 15,
  [ExtensionTypes.PLACEABLE]: 16,
  [ExtensionTypes.GROUPABLE]: 17,
  [ExtensionTypes.LANDMINE_UPDATE]: 18,
  [ExtensionTypes.ONE_TIME_TRIGGER]: 19,
  [ExtensionTypes.RESOURCES_BAG]: 20,
  [ExtensionTypes.SNARED]: 21,
} as const;

// Reverse lookup: ID -> extension type string
const ID_TO_TYPE: Record<number, string> = {};
for (const [type, id] of Object.entries(EXTENSION_TYPE_IDS)) {
  ID_TO_TYPE[id] = type;
}

/**
 * Encode a single extension type string to a uint8 ID.
 * @param type The extension type string
 * @returns Encoded uint8 value (0-255)
 */
export function encodeExtensionType(type: string): number {
  const id = EXTENSION_TYPE_IDS[type];
  if (id === undefined) {
    throw new Error(`Unknown extension type: ${type}`);
  }
  return id;
}

/**
 * Decode a uint8 ID to an extension type string.
 * @param encoded The encoded uint8 value
 * @returns The extension type string
 */
export function decodeExtensionType(encoded: number): string {
  if (encoded < 0 || encoded > 255) {
    throw new Error(`Invalid encoded extension type: ${encoded} (must be 0-255)`);
  }

  const type = ID_TO_TYPE[encoded];
  if (!type) {
    throw new Error(`No extension type found for ID: ${encoded}`);
  }

  return type;
}
