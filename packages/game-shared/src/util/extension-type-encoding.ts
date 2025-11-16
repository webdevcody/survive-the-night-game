import { ExtensionTypes } from "./extension-types";

/**
 * Extension type encoding using bit shifting.
 * Each extension type is assigned a unique bit position (0-31).
 * This allows encoding multiple extension types in a single uint32.
 */

// Bit positions for each extension type (0-31)
export const EXTENSION_TYPE_BITS: Record<string, number> = {
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
  ["snared"]: 21, // Snared extension type
} as const;

// Reverse lookup: bit position -> extension type string
const BIT_TO_TYPE: Record<number, string> = {};
for (const [type, bit] of Object.entries(EXTENSION_TYPE_BITS)) {
  BIT_TO_TYPE[bit] = type;
}

/**
 * Encode a single extension type string to a uint32 bitmap.
 * @param type The extension type string
 * @returns Encoded uint32 value (1 << bitPosition)
 */
export function encodeExtensionType(type: string): number {
  const bit = EXTENSION_TYPE_BITS[type];
  if (bit === undefined) {
    throw new Error(`Unknown extension type: ${type}`);
  }
  return 1 << bit;
}

/**
 * Decode a uint32 bitmap to an extension type string.
 * @param encoded The encoded uint32 value
 * @returns The extension type string
 */
export function decodeExtensionType(encoded: number): string {
  // Find the bit position (should only be one bit set)
  const bit = Math.log2(encoded);
  if (!Number.isInteger(bit) || bit < 0 || bit > 31) {
    throw new Error(`Invalid encoded extension type: ${encoded}`);
  }
  
  const type = BIT_TO_TYPE[bit];
  if (!type) {
    throw new Error(`No extension type found for bit position: ${bit}`);
  }
  
  return type;
}

