export const ServerSentEvents = {
  GAME_STATE_UPDATE: "gameStateUpdate",
  GAME_OVER: "gameOver",
  GAME_STARTED: "gameStarted",
  PLAYER_DEATH: "playerDeath",
  PLAYER_HURT: "playerHurt",
  PLAYER_LEFT: "playerLeft",
  PLAYER_JOINED: "playerJoined",
  YOUR_ID: "yourId",
  PLAYER_ATTACKED: "playerAttacked",
  PLAYER_DROPPED_ITEM: "playerDroppedItem",
  PLAYER_PICKED_UP_ITEM: "playerPickedUpItem",
  ZOMBIE_DEATH: "zombieDeath",
  ZOMBIE_HURT: "zombieHurt",
  ZOMBIE_ATTACKED: "zombieAttacked",
  COIN_PICKUP: "coinPickup",
  BIG_ZOMBIE_DEATH: "bigZombieDeath",
  BIG_ZOMBIE_HURT: "bigZombieHurt",
  BIG_ZOMBIE_ATTACKED: "bigZombieAttacked",
  PICKUP_ITEM: "pickupItem",
  GUN_EMPTY: "gunEmpty",
  LOOT: "loot",
  MAP: "map",
  ENEMY_WAYPOINT: "enemyWaypoint",
  SERVER_UPDATING: "serverUpdating",
  PONG: "pong",
  CHAT_MESSAGE: "chatMessage",
  EXPLOSION: "explosion",
} as const;

export const ClientSentEvents = {
  CRAFT_REQUEST: "craftRequest",
  PLAYER_INPUT: "playerInput",
  START_CRAFTING: "startCrafting",
  SET_DISPLAY_NAME: "setDisplayName",
  STOP_CRAFTING: "stopCrafting",
  ADMIN_COMMAND: "adminCommand",
  REQUEST_FULL_STATE: "requestFullState",
  PING: "ping",
  SEND_CHAT: "sendChat",
  MERCHANT_BUY: "merchantBuy",
} as const;

export type ServerSentEventType = (typeof ServerSentEvents)[keyof typeof ServerSentEvents];
export type ClientSentEventType = (typeof ClientSentEvents)[keyof typeof ClientSentEvents];
export type EventType =
  | (typeof ServerSentEvents)[keyof typeof ServerSentEvents]
  | (typeof ClientSentEvents)[keyof typeof ClientSentEvents];
