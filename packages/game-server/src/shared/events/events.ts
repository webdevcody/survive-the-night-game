export const Events = {
  CRAFT_REQUEST: "craftRequest",
  GAME_STATE_UPDATE: "gameState",
  PLAYER_INPUT: "playerInput",
  MAP: "map",
  YOUR_ID: "yourId",
  START_CRAFTING: "startCrafting",
  STOP_CRAFTING: "stopCrafting",
  PLAYER_DEATH: "playerDeath",
  ON_ENTER_TRIGGER: "onEnterTrigger",
  ON_EXIT_TRIGGER: "onExitTrigger",
} as const;

export const ServerSentEvents = {
  GAME_STATE_UPDATE: "gameStateUpdate",
  PLAYER_DEATH: "playerDeath",
} as const;

export const ClientSentEvents = {
  CRAFT_REQUEST: "craftRequest",
  PLAYER_INPUT: "playerInput",
} as const;

export type ServerSentEventType = (typeof ServerSentEvents)[keyof typeof ServerSentEvents];
export type ClientSentEventType = (typeof ClientSentEvents)[keyof typeof ClientSentEvents];
export type EventType =
  | (typeof ServerSentEvents)[keyof typeof ServerSentEvents]
  | (typeof ClientSentEvents)[keyof typeof ClientSentEvents];
