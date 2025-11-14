/**
 * Network payload compression utility
 *
 * Compresses property names to short codes and rounds x/y coordinates
 * to reduce network payload size.
 */

/**
 * Generates deterministic alphanumeric codes for compression
 * Starts with single characters (a-z, A-Z, 0-9), then 2-character combinations
 */
function generateCompressionCodes(keys: string[]): Record<string, string> {
  const codeMap: Record<string, string> = {};
  const singleChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codeIndex = 0;

  // Generate single character codes first
  for (let i = 0; i < Math.min(keys.length, singleChars.length); i++) {
    codeMap[keys[i]] = singleChars[i];
    codeIndex = i + 1;
  }

  // Generate two character codes for remaining keys
  if (codeIndex < keys.length) {
    for (let i = 0; i < singleChars.length; i++) {
      for (let j = 0; j < singleChars.length; j++) {
        if (codeIndex >= keys.length) break;
        codeMap[keys[codeIndex]] = singleChars[i] + singleChars[j];
        codeIndex++;
      }
      if (codeIndex >= keys.length) break;
    }
  }

  return codeMap;
}

// Property names that need compression (ordered by frequency/importance)
const PROPERTY_KEYS = [
  // Entity properties
  "id",
  "type",
  "extensions",
  "resourceType",
  "removedExtensions",

  // Extension types (as property names)
  "inventory",
  "destructible",
  "groupable",
  "aimAngle",
  "sequenceNumber",
  "positionable",
  "collidable",
  "movable",
  "updatable",
  "consumable",
  "ignitable",
  "combustible",
  "interactive",
  "static",
  "carryable",
  "expirable",
  "illuminated",
  "oneTimeTrigger",
  "resourcesBag",
  "triggerable",
  "triggerCooldownAttacker",

  // Common extension properties
  "items",
  "itemType",
  "health",
  "maxHealth",
  "group",
  "position",
  "size",
  "offset",
  "enabled",
  "velocity",
  "count",
  "state",
  "radius",

  // Player/entity properties
  "activeItem",
  "input",
  "facing",
  "inventoryItem",
  "dx",
  "dy",
  "interact",
  "fire",
  "drop",
  "consume",
  "consumeItemType",
  "sprint",
  "isCrafting",
  "skin",
  "kills",
  "ping",
  "displayName",
  "stamina",
  "maxStamina",

  // Resource properties
  "coins",
  "resources",
  "wood",
  "cloth",

  // Entity/item types (as property names)
  "wall",
  "tree",
  "gasoline",
  "bear_trap",
  "ak47_ammo",
  "spikes",
  "landmine",

  // Other properties
  "spreadRadius",
  "isActive",
  "playerId",
  "isReady",
  "height",
  "width",
  "hasTriggered",
  "isArmed",
  "snaredZombieId",
  "price",
  "numFires",
  "shopItems",

  // Debug properties
  "debugWaypoint",

  // Position/vector properties
  "x",
  "y",

  // Game state properties
  "entities",
  "removedEntityIds",
  "isFullState",
  "timestamp",
  "dayNumber",
  "cycleStartTime",
  "cycleDuration",
  "isDay",
  "waveNumber",
  "waveState",
  "phaseStartTime",
  "phaseDuration",
  "totalZombies",

  // Decal properties
  "decals",
  "animation",
  "light",
  "startX",
  "startY",
  "weaponKey",
  "frameCount",
  "duration",
  "frameWidth",
  "frameHeight",
  "intensity",
  "crate",

  // Map properties
  "ground",
  "collidables",
  "attackDirection",
  "biomePositions",
  "campsite",
  "farm",
  "gasStation",
  "city",
  "message",
  "isRescued",
  "color",
  "dock",
  "shed",
  "merchants",
];

// String values that need compression (ordered by frequency/importance)
const STRING_VALUE_KEYS = [
  // Extension types
  "inventory",
  "boundary",
  "fast_zombie",
  "destructible",
  "groupable",
  "positionable",
  "collidable",
  "movable",
  "fire",
  "survivor",
  "updatable",
  "consumable",
  "ignitable",
  "combustible",
  "interactive",
  "miners_hat",
  "static",
  "carryable",
  "expirable",
  "illuminated",
  "one-time-trigger",
  "resources-bag",
  "triggerable",
  "trigger-cooldown-attacker",
  "landmine-update",
  "snared",

  // Entity types (common ones)
  "zombie",
  "player",
  "item",
  "weapon",
  "projectile",
  "bullet",
  "torch",
  "environment",
  "structure",
  "bat-zombie",
  "big-zombie",
  "fast-zombie",
  "spitter-zombie",
  "exploding-zombie",
  "tree",
  "wall",
  "gasoline",
  "bear-trap",
  "bear_trap",
  "ak47-ammo",
  "ground",
  "farm",
  "gasStation",
  "campsite",
  "merchants",
  "shed",
  "dock",
  "ak47_ammo",
  "spikes",
  "landmine",
  "knife",
  "ak47",
  "shotgun",
  "pistol",
  "pistol-ammo",
  "pistol_ammo",
  "shotgun-ammo",
  "shotgun_ammo",
  "bolt-action-ammo",
  "bolt_action_ammo",
  "bolt-action-rifle",
  "bolt_action_rifle",
  "bandage",
  "cloth",
  "coin",
  "grenade",
  "grenade-launcher",
  "grenade_launcher",
  "grenade-launcher-ammo",
  "grenade_launcher_ammo",
  "flamethrower",
  "flamethrower_ammo",
  "merchant",
  "car",

  // Group values
  "enemy",
  "friendly",

  // Wave states
  "spawning",
  "active",
  "resting",
];

// Generate compression maps deterministically
const PROPERTY_MAP = generateCompressionCodes(PROPERTY_KEYS);
const STRING_VALUE_MAP = generateCompressionCodes(STRING_VALUE_KEYS);

// Reverse mapping for decompression
const REVERSE_MAP: Record<string, string> = {};
for (const [key, value] of Object.entries(PROPERTY_MAP)) {
  // Check for conflicts - if a code is already mapped, warn about it
  if (REVERSE_MAP[value] && REVERSE_MAP[value] !== key) {
    console.error(
      `[Compression] CONFLICT: Code "${value}" is mapped to both "${REVERSE_MAP[value]}" and "${key}"`
    );
  }
  REVERSE_MAP[value] = key;
}

// Reverse mapping for string values
const REVERSE_STRING_MAP: Record<string, string> = {};
for (const [key, value] of Object.entries(STRING_VALUE_MAP)) {
  // Check for conflicts - if a code is already mapped, warn about it
  if (REVERSE_STRING_MAP[value] && REVERSE_STRING_MAP[value] !== key) {
    console.error(
      `[Compression] CONFLICT: String code "${value}" is mapped to both "${REVERSE_STRING_MAP[value]}" and "${key}"`
    );
  }
  REVERSE_STRING_MAP[value] = key;
}

/**
 * Rounds x and y coordinates to 3 decimal places
 */
function roundCoordinates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "number") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(roundCoordinates);
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === "x" || key === "y") {
        // Round coordinate values to 3 decimal places
        if (typeof value === "number") {
          result[key] = Math.round(value * 1000) / 1000;
        } else {
          result[key] = value;
        }
      } else {
        // Recursively process nested objects
        result[key] = roundCoordinates(value);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Compresses string values (like extension types, entity types, etc.)
 */
function compressStringValue(value: string, context?: string): string {
  const compressed = STRING_VALUE_MAP[value];

  if (compressed === undefined) {
    // Only log for known contexts where we expect compression
    if (context === "type" || context === "group") {
      console.warn(
        `[Compression] String value "${value}" (context: ${context}) not found in STRING_VALUE_MAP, using original value`
      );
    }
    return value;
  }

  return compressed;
}

/**
 * Compresses property names and string values in an object recursively
 */
function compressPropertyNames(obj: any, parentKey?: string): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Compress string values in specific contexts
    // Check both original and compressed parent key
    const isTypeContext = parentKey === "type" || parentKey === "t";
    const isGroupContext = parentKey === "group" || parentKey === "gr";
    if (isTypeContext || isGroupContext) {
      return compressStringValue(obj, isTypeContext ? "type" : "group");
    }
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => compressPropertyNames(item, parentKey));
  }

  const compressed: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Map property name to short form
    const compressedKey = PROPERTY_MAP[key];

    // Log if property is not in the mapping
    if (compressedKey === undefined) {
      console.warn(
        `[Compression] Property "${key}" not found in PROPERTY_MAP, using original name`
      );
    }

    // Use mapped key if available, otherwise use original
    const finalKey = compressedKey || key;

    // Recursively compress nested objects, passing the ORIGINAL key as context
    // so we can check for "type" and "group" contexts correctly
    compressed[finalKey] = compressPropertyNames(value, key);
  }

  return compressed;
}

/**
 * Decompresses string values (like extension types, entity types, etc.)
 */
function decompressStringValue(value: string, context?: string): string {
  const decompressed = REVERSE_STRING_MAP[value];

  if (decompressed === undefined) {
    // If it's not in the map, it might be an uncompressed string or a new value
    // Only log if we're in a context where we expect compression
    if (context === "type" || context === "group") {
      // Check if it looks like a compressed value (short, lowercase)
      if (value.length <= 3 && value.match(/^[a-z0-9-]+$/)) {
        console.warn(
          `[Compression] String value "${value}" (context: ${context}) not found in REVERSE_STRING_MAP, using original value`
        );
      }
    }
    return value;
  }

  return decompressed;
}

/**
 * Decompresses property names and string values in an object recursively
 */
function decompressPropertyNames(obj: any, parentKey?: string): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Decompress string values in specific contexts
    // Check both compressed and decompressed parent key
    const isTypeContext = parentKey === "type" || parentKey === "t";
    const isGroupContext = parentKey === "group" || parentKey === "gr";
    if (isTypeContext || isGroupContext) {
      return decompressStringValue(obj, isTypeContext ? "type" : "group");
    }
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => decompressPropertyNames(item, parentKey));
  }

  const decompressed: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Map short form back to full property name
    const decompressedKey = REVERSE_MAP[key] || key;

    // Recursively decompress nested objects, passing the DECOMPRESSED key as context
    // so we can correctly identify "type" and "group" contexts for string value decompression
    decompressed[decompressedKey] = decompressPropertyNames(value, decompressedKey);
  }

  return decompressed;
}

/**
 * Encodes (compresses) a payload for network transmission
 */
export function encodePayload(data: any): any {
  // First round coordinates, then compress property names
  // const rounded = roundCoordinates(data);
  return compressPropertyNames(data);
}

/**
 * Decodes (decompresses) a payload received from network
 */
export function decodePayload(data: any): any {
  // First decompress property names, coordinates are already rounded
  return decompressPropertyNames(data);
}
