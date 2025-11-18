import { ClientSentEvents, type ClientSentEventType } from "../events";
import * as craftRequest from "./events/craft-request";
import * as playerInput from "./events/player-input";
import * as adminCommand from "./events/admin-command";
import * as setDisplayName from "./events/set-display-name";
import * as merchantBuy from "./events/merchant-buy";
import * as sendChat from "./events/send-chat";
import * as placeStructure from "./events/place-structure";
import * as ping from "./events/ping";
import * as pingUpdate from "./events/ping-update";
import * as noPayload from "./events/no-payload";

const CLIENT_EVENT_VALUES = new Set<string>(Object.values(ClientSentEvents));

// Event handler registry mapping event names to their serialize/deserialize functions
type EventHandler = {
  serialize: (args: any[]) => ArrayBuffer | null;
  deserialize: (buffer: ArrayBuffer) => any[] | null;
};

const eventHandlers: Record<string, EventHandler> = {
  [ClientSentEvents.CRAFT_REQUEST]: craftRequest,
  [ClientSentEvents.PLAYER_INPUT]: playerInput,
  [ClientSentEvents.ADMIN_COMMAND]: adminCommand,
  [ClientSentEvents.SET_DISPLAY_NAME]: setDisplayName,
  [ClientSentEvents.MERCHANT_BUY]: merchantBuy,
  [ClientSentEvents.SEND_CHAT]: sendChat,
  [ClientSentEvents.PLACE_STRUCTURE]: placeStructure,
  [ClientSentEvents.PING]: ping,
  [ClientSentEvents.PING_UPDATE]: pingUpdate,
  [ClientSentEvents.START_CRAFTING]: noPayload,
  [ClientSentEvents.STOP_CRAFTING]: noPayload,
  [ClientSentEvents.REQUEST_FULL_STATE]: noPayload,
  [ClientSentEvents.PLAYER_RESPAWN_REQUEST]: noPayload,
  [ClientSentEvents.TELEPORT_TO_BASE]: noPayload,
};

function isClientSentEvent(event: string): event is ClientSentEventType {
  return CLIENT_EVENT_VALUES.has(event);
}

export function serializeClientEvent(event: string, args: any[]): ArrayBuffer | null {
  if (!isClientSentEvent(event)) {
    return null;
  }

  const handler = eventHandlers[event];
  if (!handler) {
    // Unknown or unhandled client event – fall back to JSON by returning null
    return null;
  }

  return handler.serialize(args);
}

export function deserializeClientEvent(event: string, buffer: ArrayBuffer): any[] | null {
  if (!isClientSentEvent(event)) {
    return null;
  }

  const handler = eventHandlers[event];
  if (!handler) {
    return null;
  }

  // Handle empty buffers for no-payload events
  if (buffer.byteLength === 0) {
    const noPayloadEvents = new Set<string>([
      ClientSentEvents.START_CRAFTING,
      ClientSentEvents.STOP_CRAFTING,
      ClientSentEvents.REQUEST_FULL_STATE,
      ClientSentEvents.PLAYER_RESPAWN_REQUEST,
      ClientSentEvents.TELEPORT_TO_BASE,
    ]);
    if (noPayloadEvents.has(event)) {
      return handler.deserialize(buffer);
    }
    // Events that expect payload should not receive empty buffers
    return null;
  }

  return handler.deserialize(buffer);
}
