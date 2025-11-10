/**
 * ========================================================================
 * KEYBINDINGS CONFIGURATION
 * ========================================================================
 * Display names for keys shown in UI
 * These are what the user sees in tooltips and interaction prompts
 */

export const keybindingsConfig = {
  INTERACT: "f",
  FIRE: "left click",
  DROP: "g",
  QUICK_HEAL: "z",
  CRAFT: "c",
  CYCLE_WEAPON_PREV: "q",
  CYCLE_WEAPON_NEXT: "e",
  SPRINT: "shift",
  CHAT: "y",
  TOGGLE_MUTE: "m",
  TOGGLE_INSTRUCTIONS: "i",
  PLAYER_LIST: "tab",
} as const;

export type KeybindingsConfig = typeof keybindingsConfig;
