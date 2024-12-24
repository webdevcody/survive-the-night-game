export const ServerSentEvents = {
  GAME_STATE_UPDATE: "gameStateUpdate",
  PLAYER_DEATH: "playerDeath",
  PLAYER_HURT: "playerHurt",
  YOUR_ID: "yourId",
  PLAYER_ATTACKED: "playerAttacked",
  PLAYER_DROPPED_ITEM: "playerDroppedItem",
  PLAYER_PICKED_UP_ITEM: "playerPickedUpItem",
  ZOMBIE_DEATH: "zombieDeath",
  ZOMBIE_HURT: "zombieHurt",
  MAP: "map",
} as const;

export const ClientSentEvents = {
  CRAFT_REQUEST: "craftRequest",
  PLAYER_INPUT: "playerInput",
  START_CRAFTING: "startCrafting",
  STOP_CRAFTING: "stopCrafting",
} as const;

export type ServerSentEventType = (typeof ServerSentEvents)[keyof typeof ServerSentEvents];
export type ClientSentEventType = (typeof ClientSentEvents)[keyof typeof ClientSentEvents];
export type EventType =
  | (typeof ServerSentEvents)[keyof typeof ServerSentEvents]
  | (typeof ClientSentEvents)[keyof typeof ClientSentEvents];
