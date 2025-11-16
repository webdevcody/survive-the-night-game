import { ClientSentEvents, type ClientSentEventType } from "../events";
import { ArrayBufferWriter, BufferReader } from "../../util/buffer-serialization";
import type { RecipeType } from "../../util/recipes";
import type { Input } from "../../util/input";
import type { AdminCommand } from "../../commands/commands";
import type { ItemType } from "../../util/inventory";
import { Direction } from "../../util/direction";

const CLIENT_EVENT_VALUES = new Set<string>(Object.values(ClientSentEvents));

function isClientSentEvent(event: string): event is ClientSentEventType {
  return CLIENT_EVENT_VALUES.has(event);
}

export function serializeClientEvent(event: string, args: any[]): ArrayBuffer | null {
  if (!isClientSentEvent(event)) {
    return null;
  }

  const writer = new ArrayBufferWriter(256);

  switch (event) {
    case ClientSentEvents.CRAFT_REQUEST: {
      const recipe = (args[0] ?? "") as RecipeType | string;
      writer.writeString(String(recipe));
      break;
    }
    case ClientSentEvents.PLAYER_INPUT: {
      const input = args[0] as Input | undefined;
      if (!input) {
        return null;
      }
      writer.writeUInt32((input.facing ?? Direction.Down) >>> 0);
      writer.writeFloat64(input.dx ?? 0);
      writer.writeFloat64(input.dy ?? 0);
      writer.writeBoolean(!!input.interact);
      writer.writeBoolean(!!input.fire);
      writer.writeUInt32((input.inventoryItem ?? 1) >>> 0);
      writer.writeBoolean(!!input.drop);
      writer.writeBoolean(!!input.consume);
      writer.writeNullable(input.consumeItemType, (itemType) => writer.writeString(String(itemType)));
      writer.writeBoolean(!!input.sprint);
      writer.writeBoolean(input.sequenceNumber !== undefined);
      if (input.sequenceNumber !== undefined) {
        writer.writeUInt32((input.sequenceNumber ?? 0) >>> 0);
      }
      writer.writeBoolean(input.aimAngle !== undefined);
      if (input.aimAngle !== undefined) {
        writer.writeFloat64(input.aimAngle);
      }
      break;
    }
    case ClientSentEvents.ADMIN_COMMAND: {
      const command = args[0] as AdminCommand | undefined;
      if (!command) {
        return null;
      }
      writer.writeString(String(command.command));
      writer.writeString(command.password ?? "");
      const payloadString = command.payload !== undefined ? JSON.stringify(command.payload) : "null";
      writer.writeString(payloadString);
      break;
    }
    case ClientSentEvents.SET_DISPLAY_NAME: {
      const displayName = (args[0] ?? "") as string;
      writer.writeString(displayName);
      break;
    }
    case ClientSentEvents.MERCHANT_BUY: {
      const data = args[0] as { merchantId: number; itemIndex: number } | undefined;
      if (!data) {
        return null;
      }
      writer.writeUInt16(data.merchantId ?? 0);
      writer.writeUInt32(Math.max(0, Math.trunc(data.itemIndex ?? 0)));
      break;
    }
    case ClientSentEvents.SEND_CHAT: {
      const data = args[0] as { message: string } | undefined;
      if (!data) {
        return null;
      }
      writer.writeString(data.message ?? "");
      break;
    }
    case ClientSentEvents.PLACE_STRUCTURE: {
      const data = args[0] as { itemType: ItemType; position: { x: number; y: number } } | undefined;
      if (!data) {
        return null;
      }
      writer.writeString(String(data.itemType));
      const position = data.position ?? { x: 0, y: 0 };
      writer.writeFloat64(position.x ?? 0);
      writer.writeFloat64(position.y ?? 0);
      break;
    }
    case ClientSentEvents.PING: {
      const timestamp = Number(args[0] ?? 0);
      writer.writeFloat64(timestamp);
      break;
    }
    case ClientSentEvents.PING_UPDATE: {
      const latency = Number(args[0] ?? 0);
      writer.writeFloat64(latency);
      break;
    }
    case ClientSentEvents.START_CRAFTING:
    case ClientSentEvents.STOP_CRAFTING:
    case ClientSentEvents.REQUEST_FULL_STATE:
    case ClientSentEvents.PLAYER_RESPAWN_REQUEST:
    case ClientSentEvents.TELEPORT_TO_BASE: {
      // No payload required; zero-length buffer is sufficient
      break;
    }
    default: {
      // Unknown or unhandled client event – fall back to JSON by returning null
      return null;
    }
  }

  return writer.getBuffer();
}

export function deserializeClientEvent(event: string, buffer: ArrayBuffer): any[] | null {
  if (!isClientSentEvent(event)) {
    return null;
  }

  if (buffer.byteLength === 0) {
    switch (event) {
      case ClientSentEvents.START_CRAFTING:
      case ClientSentEvents.STOP_CRAFTING:
      case ClientSentEvents.REQUEST_FULL_STATE:
      case ClientSentEvents.PLAYER_RESPAWN_REQUEST:
      case ClientSentEvents.TELEPORT_TO_BASE:
        return [];
      default:
        // Events that expect payload should not receive empty buffers
        break;
    }
  }

  const reader = new BufferReader(buffer);

  switch (event) {
    case ClientSentEvents.CRAFT_REQUEST: {
      const recipe = reader.readString() as RecipeType;
      return [recipe];
    }
    case ClientSentEvents.PLAYER_INPUT: {
      const facing = reader.readUInt32();
      const dx = reader.readFloat64();
      const dy = reader.readFloat64();
      const interact = reader.readBoolean();
      const fire = reader.readBoolean();
      const inventoryItem = reader.readUInt32();
      const drop = reader.readBoolean();
      const consume = reader.readBoolean();
      const consumeItemType = reader.readNullable<string>(() => reader.readString()) as ItemType | null;
      const sprint = reader.readBoolean();
      const hasSequence = reader.readBoolean();
      const sequenceNumber = hasSequence ? reader.readUInt32() : undefined;
      const hasAimAngle = reader.readBoolean();
      const aimAngle = hasAimAngle ? reader.readFloat64() : undefined;
      const input: Input = {
        facing: facing as Direction,
        dx,
        dy,
        interact,
        fire,
        inventoryItem,
        drop,
        consume,
        consumeItemType: consumeItemType ?? null,
        sprint,
        sequenceNumber,
        aimAngle,
      };
      return [input];
    }
    case ClientSentEvents.ADMIN_COMMAND: {
      const command = reader.readString();
      const password = reader.readString();
      const payloadRaw = reader.readString();
      let payload: unknown = null;
      if (payloadRaw.length > 0 && payloadRaw !== "null") {
        try {
          payload = JSON.parse(payloadRaw);
        } catch {
          payload = payloadRaw;
        }
      }
      const adminCommand: AdminCommand = {
        command: command as AdminCommand["command"],
        password,
        payload,
      };
      return [adminCommand];
    }
    case ClientSentEvents.SET_DISPLAY_NAME: {
      const displayName = reader.readString();
      return [displayName];
    }
    case ClientSentEvents.MERCHANT_BUY: {
      const merchantId = reader.readUInt16();
      const itemIndex = reader.readUInt32();
      return [{ merchantId, itemIndex }];
    }
    case ClientSentEvents.SEND_CHAT: {
      const message = reader.readString();
      return [{ message }];
    }
    case ClientSentEvents.PLACE_STRUCTURE: {
      const itemType = reader.readString() as ItemType;
      const x = reader.readFloat64();
      const y = reader.readFloat64();
      return [{ itemType, position: { x, y } }];
    }
    case ClientSentEvents.PING: {
      const timestamp = reader.readFloat64();
      return [timestamp];
    }
    case ClientSentEvents.PING_UPDATE: {
      const latency = reader.readFloat64();
      return [latency];
    }
    case ClientSentEvents.START_CRAFTING:
    case ClientSentEvents.STOP_CRAFTING:
    case ClientSentEvents.REQUEST_FULL_STATE:
    case ClientSentEvents.PLAYER_RESPAWN_REQUEST:
    case ClientSentEvents.TELEPORT_TO_BASE: {
      return [];
    }
    default:
      return null;
  }
}
