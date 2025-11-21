/**
 * ========================================================================
 * KEYBINDINGS CONFIGURATION
 * ========================================================================
 * Display names for keys shown in UI
 * These are what the user sees in tooltips and interaction prompts
 */

export const keybindingsConfig = {
  INTERACT: "e",
  FIRE: "left click",
  DROP: "g",
  QUICK_HEAL: "z",
  CRAFT: "c",
  SPRINT: "shift",
  CHAT: "y",
  TOGGLE_MUTE: "m",
  TOGGLE_INSTRUCTIONS: "i",
  PLAYER_LIST: "tab",
  WEAPONS_HUD: "f",
} as const;

export type KeybindingsConfig = typeof keybindingsConfig;
