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
  TOGGLE_INSTRUCTIONS: "p",
  PLAYER_LIST: "tab",
  WEAPON_LOADOUT_PRIMARY: "1",
  WEAPON_LOADOUT_SECONDARY: "2",
  WEAPON_LOADOUT_MELEE: "3",
  SWAP_PRIMARY_SECONDARY: "q",
} as const;

export type KeybindingsConfig = typeof keybindingsConfig;
