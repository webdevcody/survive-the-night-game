import { ServerSentEvents, type ServerSentEventType } from "../events";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";
import Vector2 from "../../util/vector2";

const SERVER_EVENT_VALUES = new Set<string>(Object.values(ServerSentEvents));

function isServerSentEvent(event: string): event is ServerSentEventType {
  return SERVER_EVENT_VALUES.has(event);
}

/**
 * Serialize a server-sent event to a Buffer (for server-side use)
 * Returns null if the event should be sent as JSON instead
 */
export function serializeServerEvent(event: string, args: any[]): Buffer | null {
  if (!isServerSentEvent(event)) {
    return null;
  }

  const writer = new BufferWriter(1024);

  switch (event) {
    case ServerSentEvents.PONG: {
      const timestamp = Number(args[0]?.timestamp ?? args[0] ?? 0);
      writer.writeFloat64(timestamp);
      break;
    }
    case ServerSentEvents.YOUR_ID: {
      const playerId = Number(args[0] ?? 0);
      writer.writeUInt16(playerId);
      break;
    }
    case ServerSentEvents.PLAYER_JOINED: {
      const data = args[0] ?? {};
      writer.writeUInt16(data.playerId ?? 0);
      writer.writeString(data.displayName ?? "");
      break;
    }
    case ServerSentEvents.PLAYER_LEFT: {
      const data = args[0] ?? {};
      writer.writeUInt16(data.playerId ?? 0);
      writer.writeString(data.displayName ?? "");
      break;
    }
    case ServerSentEvents.PLAYER_DEATH: {
      const data = args[0] ?? {};
      writer.writeUInt16(data.playerId ?? 0);
      writer.writeString(data.displayName ?? "");
      break;
    }
    case ServerSentEvents.PLAYER_PICKED_UP_ITEM: {
      const data = args[0] ?? {};
      writer.writeUInt16(data.playerId ?? 0);
      writer.writeString(data.itemType ?? "");
      break;
    }
    case ServerSentEvents.PLAYER_DROPPED_ITEM: {
      const data = args[0] ?? {};
      writer.writeUInt16(data.playerId ?? 0);
      writer.writeString(data.itemType ?? "");
      break;
    }
    case ServerSentEvents.PLAYER_PICKED_UP_RESOURCE: {
      const data = args[0] ?? {};
      writer.writeUInt16(data.playerId ?? 0);
      writer.writeString(data.resourceType ?? "");
      writer.writeUInt32(data.amount ?? 0);
      break;
    }
    case ServerSentEvents.CHAT_MESSAGE: {
      const data = args[0] ?? {};
      writer.writeUInt16(data.playerId ?? 0);
      writer.writeString(data.message ?? "");
      break;
    }
    case ServerSentEvents.COIN_PICKUP:
    case ServerSentEvents.CRAFT:
    case ServerSentEvents.GUN_EMPTY:
    case ServerSentEvents.GUN_FIRED:
    case ServerSentEvents.LOOT:
    case ServerSentEvents.ZOMBIE_DEATH:
    case ServerSentEvents.ZOMBIE_HURT:
    case ServerSentEvents.ZOMBIE_ATTACKED:
    case ServerSentEvents.BIG_ZOMBIE_DEATH:
    case ServerSentEvents.BIG_ZOMBIE_HURT:
    case ServerSentEvents.BIG_ZOMBIE_ATTACKED:
    case ServerSentEvents.PLAYER_HURT:
    case ServerSentEvents.PLAYER_ATTACKED: {
      // Simple string events - just write the string
      const value = String(args[0] ?? "");
      writer.writeString(value);
      break;
    }
    case ServerSentEvents.GAME_STARTED:
    case ServerSentEvents.GAME_OVER:
    case ServerSentEvents.SERVER_UPDATING: {
      // No payload events - zero-length buffer
      break;
    }
    case ServerSentEvents.EXPLOSION: {
      const data = args[0] ?? {};
      // Handle both { position: Vector2 } and { x, y } formats
      const position = data.position ?? data;
      const x = position?.x ?? 0;
      const y = position?.y ?? 0;
      writer.writeFloat64(x);
      writer.writeFloat64(y);
      writer.writeFloat64(data.radius ?? 0);
      break;
    }
    case ServerSentEvents.CAR_REPAIR: {
      const data = args[0] ?? {};
      writer.writeUInt16(data.playerId ?? 0);
      writer.writeFloat64(data.amount ?? 0);
      break;
    }
    case ServerSentEvents.WAVE_START: {
      const data = args[0] ?? {};
      const waveNumber = data.waveNumber ?? 0;
      if (waveNumber > 255) {
        throw new Error(`waveNumber ${waveNumber} exceeds uint8 maximum (255)`);
      }
      writer.writeUInt8(waveNumber);
      writer.writeFloat64(data.startTime ?? 0);
      break;
    }
    case ServerSentEvents.BUILD: {
      const data = args[0] ?? {};
      writer.writeUInt16(data.playerId ?? 0);
      writer.writeString(data.itemType ?? "");
      writer.writeFloat64(data.x ?? 0);
      writer.writeFloat64(data.y ?? 0);
      break;
    }
    case ServerSentEvents.GAME_MESSAGE: {
      const data = args[0] ?? {};
      writer.writeString(data.message ?? "");
      writer.writeUInt32(data.type ?? 0);
      break;
    }
    case ServerSentEvents.MAP:
    case ServerSentEvents.GAME_STATE_UPDATE: {
      // Complex events - these are handled specially elsewhere
      // MAP uses custom serialization, GAME_STATE_UPDATE uses BufferManager
      return null;
    }
    default: {
      // Unknown or unhandled server event – fall back to JSON by returning null
      return null;
    }
  }

  return writer.getBuffer();
}

/**
 * Deserialize a server-sent event from an ArrayBuffer (for client-side use)
 * Returns null if the event should be deserialized as JSON instead
 */
export function deserializeServerEvent(event: string, buffer: ArrayBuffer): any[] | null {
  if (!isServerSentEvent(event)) {
    return null;
  }

  // Handle no-payload events
  if (buffer.byteLength === 0) {
    switch (event) {
      case ServerSentEvents.GAME_STARTED:
      case ServerSentEvents.GAME_OVER:
      case ServerSentEvents.SERVER_UPDATING:
        return [];
      default:
        // Events that expect payload should not receive empty buffers
        return null;
    }
  }

  const reader = new BufferReader(buffer);

  switch (event) {
    case ServerSentEvents.PONG: {
      const timestamp = reader.readFloat64();
      return [{ timestamp }];
    }
    case ServerSentEvents.YOUR_ID: {
      const playerId = reader.readUInt16();
      return [playerId];
    }
    case ServerSentEvents.PLAYER_JOINED: {
      const playerId = reader.readUInt16();
      const displayName = reader.readString();
      return [{ playerId, displayName }];
    }
    case ServerSentEvents.PLAYER_LEFT: {
      const playerId = reader.readUInt16();
      const displayName = reader.readString();
      return [{ playerId, displayName }];
    }
    case ServerSentEvents.PLAYER_DEATH: {
      const playerId = reader.readUInt16();
      const displayName = reader.readString();
      return [{ playerId, displayName }];
    }
    case ServerSentEvents.PLAYER_PICKED_UP_ITEM: {
      const playerId = reader.readUInt16();
      const itemType = reader.readString();
      return [{ playerId, itemType }];
    }
    case ServerSentEvents.PLAYER_DROPPED_ITEM: {
      const playerId = reader.readUInt16();
      const itemType = reader.readString();
      return [{ playerId, itemType }];
    }
    case ServerSentEvents.PLAYER_PICKED_UP_RESOURCE: {
      const playerId = reader.readUInt16();
      const resourceType = reader.readString();
      const amount = reader.readUInt32();
      return [{ playerId, resourceType, amount }];
    }
    case ServerSentEvents.CHAT_MESSAGE: {
      const playerId = reader.readUInt16();
      const message = reader.readString();
      return [{ playerId, message }];
    }
    case ServerSentEvents.COIN_PICKUP:
    case ServerSentEvents.CRAFT:
    case ServerSentEvents.GUN_EMPTY:
    case ServerSentEvents.GUN_FIRED:
    case ServerSentEvents.LOOT:
    case ServerSentEvents.ZOMBIE_DEATH:
    case ServerSentEvents.ZOMBIE_HURT:
    case ServerSentEvents.ZOMBIE_ATTACKED:
    case ServerSentEvents.BIG_ZOMBIE_DEATH:
    case ServerSentEvents.BIG_ZOMBIE_HURT:
    case ServerSentEvents.BIG_ZOMBIE_ATTACKED:
    case ServerSentEvents.PLAYER_HURT:
    case ServerSentEvents.PLAYER_ATTACKED: {
      const value = reader.readString();
      return [value];
    }
    case ServerSentEvents.GAME_STARTED:
    case ServerSentEvents.GAME_OVER:
    case ServerSentEvents.SERVER_UPDATING: {
      // No payload events - return empty array for consistency
      // Note: buffer.byteLength will be 0 for these events
      return [];
    }
    case ServerSentEvents.EXPLOSION: {
      const x = reader.readFloat64();
      const y = reader.readFloat64();
      const radius = reader.readFloat64();
      // Return in format expected by ExplosionEvent constructor: { position: Vector2 }
      return [{ position: new Vector2(x, y), radius }];
    }
    case ServerSentEvents.CAR_REPAIR: {
      const playerId = reader.readUInt16();
      const amount = reader.readFloat64();
      return [{ playerId, amount }];
    }
    case ServerSentEvents.WAVE_START: {
      const waveNumber = reader.readUInt8();
      const startTime = reader.readFloat64();
      return [{ waveNumber, startTime }];
    }
    case ServerSentEvents.BUILD: {
      const playerId = reader.readUInt16();
      const itemType = reader.readString();
      const x = reader.readFloat64();
      const y = reader.readFloat64();
      return [{ playerId, itemType, x, y }];
    }
    case ServerSentEvents.GAME_MESSAGE: {
      const message = reader.readString();
      const type = reader.readUInt32();
      return [{ message, type }];
    }
    case ServerSentEvents.MAP:
    case ServerSentEvents.GAME_STATE_UPDATE: {
      // Complex events - handled specially elsewhere
      return null;
    }
    default:
      return null;
  }
}
