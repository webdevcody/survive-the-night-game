import { ClientSentEvents, type ClientSentEventType } from "../events";
import { ArrayBufferWriter, BufferReader } from "../../util/buffer-serialization";
import { CraftRequestEvent } from "./events/craft-request";
import { PlayerInputEvent } from "./events/player-input";
import { AdminCommandEvent } from "./events/admin-command";
import { SetDisplayNameEvent } from "./events/set-display-name";
import { MerchantBuyEvent } from "./events/merchant-buy";
import { SendChatEvent } from "./events/send-chat";
import { PlaceStructureEvent } from "./events/place-structure";
import { PingEvent } from "./events/ping";
import { PingUpdateEvent } from "./events/ping-update";
import { NoPayloadEvent } from "./events/no-payload";

const CLIENT_EVENT_VALUES = new Set<string>(Object.values(ClientSentEvents));

// Registry mapping event strings to event classes with serialization methods
type EventSerializer = {
  serializeToBuffer: (writer: ArrayBufferWriter, data: any) => void;
  deserializeFromBuffer: (reader: BufferReader) => any;
};

const eventRegistry: Record<string, EventSerializer> = {
  [ClientSentEvents.CRAFT_REQUEST]: CraftRequestEvent,
  [ClientSentEvents.PLAYER_INPUT]: PlayerInputEvent,
  [ClientSentEvents.ADMIN_COMMAND]: AdminCommandEvent,
  [ClientSentEvents.SET_DISPLAY_NAME]: SetDisplayNameEvent,
  [ClientSentEvents.MERCHANT_BUY]: MerchantBuyEvent,
  [ClientSentEvents.SEND_CHAT]: SendChatEvent,
  [ClientSentEvents.PLACE_STRUCTURE]: PlaceStructureEvent,
  [ClientSentEvents.PING]: PingEvent,
  [ClientSentEvents.PING_UPDATE]: PingUpdateEvent,
  [ClientSentEvents.START_CRAFTING]: NoPayloadEvent,
  [ClientSentEvents.STOP_CRAFTING]: NoPayloadEvent,
  [ClientSentEvents.REQUEST_FULL_STATE]: NoPayloadEvent,
  [ClientSentEvents.PLAYER_RESPAWN_REQUEST]: NoPayloadEvent,
  [ClientSentEvents.TELEPORT_TO_BASE]: NoPayloadEvent,
};

function isClientSentEvent(event: string): event is ClientSentEventType {
  return CLIENT_EVENT_VALUES.has(event);
}

/**
 * Serialize a client-sent event to an ArrayBuffer (for client-side use)
 * Returns null if the event should be sent as JSON instead
 */
export function serializeClientEvent(event: string, args: any[]): ArrayBuffer | null {
  if (!isClientSentEvent(event)) {
    return null;
  }

  const serializer = eventRegistry[event];
  if (!serializer) {
    // Unknown or unhandled client event – fall back to JSON by returning null
    return null;
  }

  const writer = new ArrayBufferWriter(256);
  // For no-payload events, args[0] may be undefined, so use empty object
  const data = args[0] ?? {};

  serializer.serializeToBuffer(writer, data);

  return writer.getBuffer();
}

/**
 * Deserialize a client-sent event from an ArrayBuffer (for server-side use)
 * Returns null if the event should be deserialized as JSON instead
 */
export function deserializeClientEvent(event: string, buffer: ArrayBuffer): any[] | null {
  if (!isClientSentEvent(event)) {
    return null;
  }

  const serializer = eventRegistry[event];
  if (!serializer) {
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
      const data = serializer.deserializeFromBuffer(new BufferReader(buffer));
      return [data];
    }
    // Events that expect payload should not receive empty buffers
    return null;
  }

  const reader = new BufferReader(buffer);
  const data = serializer.deserializeFromBuffer(reader);

  // Normalize return format - wrap primitives in array, keep objects as-is
  if (typeof data === "number" || typeof data === "string" || data === undefined) {
    return [data];
  }
  return [data];
}
