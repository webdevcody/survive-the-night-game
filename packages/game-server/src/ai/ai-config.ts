/**
 * AI Configuration - Facade for shared config
 *
 * This file re-exports AI configuration from the shared config package
 * for backward compatibility with existing AI code.
 *
 * All values are now centralized in @shared/config/ai-config.ts
 */

import {
  getConfig,
  aiConfig,
  aiThreatWeights,
  AI_GOOD_WEAPONS,
  AI_ALL_WEAPONS,
  AI_WEAPON_AMMO_MAP,
  AI_WEAPON_PRIORITY,
  AI_MELEE_WEAPONS,
  getAiWeaponRanges,
} from "@shared/config";

// Re-export the main config object with the expected name
// Uses getter to support runtime config modification
export const AI_CONFIG = aiConfig;

// Re-export threat weights with expected name
export const THREAT_WEIGHTS = aiThreatWeights;

// Re-export weapon arrays with expected names
export const GOOD_WEAPONS = AI_GOOD_WEAPONS;
export const ALL_WEAPONS = AI_ALL_WEAPONS;
export const WEAPON_AMMO_MAP = AI_WEAPON_AMMO_MAP;
export const WEAPON_PRIORITY = AI_WEAPON_PRIORITY;
export const MELEE_WEAPONS = AI_MELEE_WEAPONS;

// Re-export weapon ranges (dynamic based on config)
// Note: This is a getter function to support runtime config changes
export const WEAPON_RANGES = getAiWeaponRanges(getConfig().ai);

// Re-export the helper function for cases where dynamic ranges are needed
export { getAiWeaponRanges };
