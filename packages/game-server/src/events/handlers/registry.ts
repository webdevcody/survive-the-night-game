import { SocketEventHandler } from "./types";
import { playerInputHandler } from "./player-input";
import { craftRequestHandler, startCraftingHandler, stopCraftingHandler } from "./craft";
import { adminCommandHandler } from "./admin-command";
import { setDisplayNameHandler } from "./display-name";
import { merchantBuyHandler } from "./merchant";
import { requestFullStateHandler } from "./full-state";
import { pingHandler, pingUpdateHandler } from "./ping";
import { sendChatHandler } from "./chat";
import { placeStructureHandler } from "./structure";
import { playerRespawnRequestHandler } from "./respawn";
import { teleportToBaseHandler } from "./teleport";
import { disconnectHandler } from "./disconnect";

/**
 * Registry of all socket event handlers.
 * To add a new event handler:
 * 1. Create a handler file in this directory
 * 2. Export a SocketEventHandler object
 * 3. Import and add it to this array
 */
export const socketEventHandlers: SocketEventHandler[] = [
  playerInputHandler,
  craftRequestHandler,
  startCraftingHandler,
  stopCraftingHandler,
  adminCommandHandler,
  setDisplayNameHandler,
  merchantBuyHandler,
  requestFullStateHandler,
  pingHandler,
  pingUpdateHandler,
  sendChatHandler,
  placeStructureHandler,
  playerRespawnRequestHandler,
  teleportToBaseHandler,
  disconnectHandler,
];
