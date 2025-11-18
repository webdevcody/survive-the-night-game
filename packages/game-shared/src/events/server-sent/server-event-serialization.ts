import { ServerSentEvents, type ServerSentEventType } from "../events";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";
import { PongEvent } from "./events/pong-event";
import { YourIdEvent } from "./events/your-id-event";
import { PlayerJoinedEvent } from "./events/player-joined-event";
import { PlayerLeftEvent } from "./events/player-left-event";
import { PlayerDeathEvent } from "./events/player-death-event";
import { PlayerPickedUpItemEvent } from "./events/pickup-item-event";
import { PlayerDroppedItemEvent } from "./events/player-dropped-item-event";
import { PlayerPickedUpResourceEvent } from "./events/pickup-resource-event";
import { ChatMessageEvent } from "./events/chat-message-event";
import { CoinPickupEvent } from "./events/coin-pickup-event";
import { CraftEvent } from "./events/craft-event";
import { GunEmptyEvent } from "./events/gun-empty-event";
import { GunFiredEvent } from "./events/gun-fired-event";
import { LootEvent } from "./events/loot-event";
import { ZombieDeathEvent } from "./events/zombie-death-event";
import { ZombieHurtEvent } from "./events/zombie-hurt-event";
import { ZombieAttackedEvent } from "./events/zombie-attacked-event";
import { BigZombieDeathEvent } from "./events/big-zombie-death-event";
import { BigZombieHurtEvent } from "./events/big-zombie-hurt-event";
import { BigZombieAttackedEvent } from "./events/big-zombie-attacked-event";
import { PlayerHurtEvent } from "./events/player-hurt-event";
import { PlayerAttackedEvent } from "./events/player-attacked-event";
import { GameStartedEvent } from "./events/game-started-event";
import { GameOverEvent } from "./events/game-over-event";
import { ServerUpdatingEvent } from "./events/server-updating-event";
import { ExplosionEvent } from "./events/explosion-event";
import { CarRepairEvent } from "./events/car-repair-event";
import { WaveStartEvent } from "./events/wave-start-event";
import { BuildEvent } from "./events/build-event";
import { BossStepEvent } from "./events/boss-step-event";
import { BossSummonEvent } from "./events/boss-summon-event";
import { GameMessageEvent } from "./events/game-message-event";

const SERVER_EVENT_VALUES = new Set<string>(Object.values(ServerSentEvents));

function isServerSentEvent(event: string): event is ServerSentEventType {
  return SERVER_EVENT_VALUES.has(event);
}

// Registry mapping event strings to event classes with serialization methods
type EventSerializer = {
  serializeToBuffer: (writer: BufferWriter, data: any) => void;
  deserializeFromBuffer: (reader: BufferReader) => any;
};

const eventRegistry: Record<string, EventSerializer> = {
  [ServerSentEvents.PONG]: PongEvent,
  [ServerSentEvents.YOUR_ID]: YourIdEvent,
  [ServerSentEvents.PLAYER_JOINED]: PlayerJoinedEvent,
  [ServerSentEvents.PLAYER_LEFT]: PlayerLeftEvent,
  [ServerSentEvents.PLAYER_DEATH]: PlayerDeathEvent,
  [ServerSentEvents.PLAYER_PICKED_UP_ITEM]: PlayerPickedUpItemEvent,
  [ServerSentEvents.PLAYER_DROPPED_ITEM]: PlayerDroppedItemEvent,
  [ServerSentEvents.PLAYER_PICKED_UP_RESOURCE]: PlayerPickedUpResourceEvent,
  [ServerSentEvents.CHAT_MESSAGE]: ChatMessageEvent,
  [ServerSentEvents.COIN_PICKUP]: CoinPickupEvent,
  [ServerSentEvents.CRAFT]: CraftEvent,
  [ServerSentEvents.GUN_EMPTY]: GunEmptyEvent,
  [ServerSentEvents.GUN_FIRED]: GunFiredEvent,
  [ServerSentEvents.LOOT]: LootEvent,
  [ServerSentEvents.ZOMBIE_DEATH]: ZombieDeathEvent,
  [ServerSentEvents.ZOMBIE_HURT]: ZombieHurtEvent,
  [ServerSentEvents.ZOMBIE_ATTACKED]: ZombieAttackedEvent,
  [ServerSentEvents.BIG_ZOMBIE_DEATH]: BigZombieDeathEvent,
  [ServerSentEvents.BIG_ZOMBIE_HURT]: BigZombieHurtEvent,
  [ServerSentEvents.BIG_ZOMBIE_ATTACKED]: BigZombieAttackedEvent,
  [ServerSentEvents.PLAYER_HURT]: PlayerHurtEvent,
  [ServerSentEvents.PLAYER_ATTACKED]: PlayerAttackedEvent,
  [ServerSentEvents.GAME_STARTED]: GameStartedEvent,
  [ServerSentEvents.GAME_OVER]: GameOverEvent,
  [ServerSentEvents.SERVER_UPDATING]: ServerUpdatingEvent,
  [ServerSentEvents.EXPLOSION]: ExplosionEvent,
  [ServerSentEvents.CAR_REPAIR]: CarRepairEvent,
  [ServerSentEvents.WAVE_START]: WaveStartEvent,
  [ServerSentEvents.BUILD]: BuildEvent,
  [ServerSentEvents.BOSS_STEP]: BossStepEvent,
  [ServerSentEvents.BOSS_SUMMON]: BossSummonEvent,
  [ServerSentEvents.GAME_MESSAGE]: GameMessageEvent,
};

/**
 * Serialize a server-sent event to a Buffer (for server-side use)
 * Returns null if the event should be sent as JSON instead
 */
export function serializeServerEvent(event: string, args: any[]): Buffer | null {
  if (!isServerSentEvent(event)) {
    return null;
  }

  const serializer = eventRegistry[event];
  if (!serializer) {
    // Unknown or unhandled server event (e.g., MAP, GAME_STATE_UPDATE) – fall back to JSON by returning null
    return null;
  }

  const writer = new BufferWriter(1024);
  const data = args[0];

  serializer.serializeToBuffer(writer, data);

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

  const serializer = eventRegistry[event];
  if (!serializer) {
    return null;
  }

  // Events that expect payload should not receive empty buffers
  if (buffer.byteLength === 0) {
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
