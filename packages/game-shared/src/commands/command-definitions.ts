// Command argument type for autocomplete
export type CommandArgumentType = "entity" | "mode" | "string";

// Command argument definition
export interface CommandArgumentDefinition {
  name: string;
  type: CommandArgumentType;
  required: boolean;
}

// Command definition for autocomplete
export interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  requiresAdmin: boolean;
  arguments?: CommandArgumentDefinition[];
}

// All available commands (synced with server commands)
export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    name: "help",
    description: "Shows all available commands",
    usage: "/help",
    requiresAdmin: false,
  },
  {
    name: "spawn",
    description: "Spawns an entity near the player",
    usage: "/spawn <entity_name>",
    requiresAdmin: true,
    arguments: [{ name: "entity_name", type: "entity", required: true }],
  },
  {
    name: "mode",
    description: "Switches the game mode and restarts",
    usage: "/mode <royale|waves|infection>",
    requiresAdmin: true,
    arguments: [{ name: "mode", type: "mode", required: true }],
  },
  {
    name: "restart",
    description: "Starts a fresh new game",
    usage: "/restart",
    requiresAdmin: true,
  },
  {
    name: "list",
    description: "Lists all spawnable entities",
    usage: "/list",
    requiresAdmin: true,
  },
];

// Game modes for autocomplete
export const GAME_MODES = ["royale", "waves", "infection"] as const;
export type GameMode = (typeof GAME_MODES)[number];
