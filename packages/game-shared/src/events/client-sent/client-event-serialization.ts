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
import {
  serializeEvent,
  deserializeEvent,
  type IBufferWriter,
} from "../shared-event-serialization";

const CLIENT_EVENT_VALUES = new Set<string>(Object.values(ClientSentEvents));

// Registry mapping event strings to event classes with serialization methods
const eventRegistry: Record<string, IBufferWriter> = {
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
  return serializeEvent(
    event,
    args,
    eventRegistry,
    isClientSentEvent,
    (size) => new ArrayBufferWriter(size),
    256,
    (event) => {
      // Check if this event uses NoPayloadEvent serializer
      const serializer = eventRegistry[event];
      return serializer === NoPayloadEvent ? {} : undefined;
    }
  );
}

/**
 * Deserialize a client-sent event from an ArrayBuffer (for server-side use)
 * Returns null if the event should be deserialized as JSON instead
 */
export function deserializeClientEvent(event: string, buffer: ArrayBuffer): any[] | null {
  return deserializeEvent(event, buffer, eventRegistry, isClientSentEvent, (event, buffer) => {
    const serializer = eventRegistry[event];
    // Check if this event uses NoPayloadEvent serializer
    if (serializer === NoPayloadEvent) {
      const data = serializer.deserializeFromBuffer(new BufferReader(buffer));
      return [data];
    }
    return null;
  });
}
