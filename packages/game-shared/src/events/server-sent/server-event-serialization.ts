import { ServerSentEvents, type ServerSentEventType } from "../events";
import { BufferWriter } from "../../util/buffer-serialization";
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
import { ZombieAlertedEvent } from "./events/zombie-alerted-event";
import { BigZombieDeathEvent } from "./events/big-zombie-death-event";
import { BigZombieHurtEvent } from "./events/big-zombie-hurt-event";
import { BigZombieAttackedEvent } from "./events/big-zombie-attacked-event";
import { PlayerHurtEvent } from "./events/player-hurt-event";
import { PlayerAttackedEvent } from "./events/player-attacked-event";
import { GameStartedEvent } from "./events/game-started-event";
import { ServerUpdatingEvent } from "./events/server-updating-event";
import { ExplosionEvent } from "./events/explosion-event";
import { CarRepairEvent } from "./events/car-repair-event";
import { BuildEvent } from "./events/build-event";
import { BossStepEvent } from "./events/boss-step-event";
import { BossSummonEvent } from "./events/boss-summon-event";
import { BossSplitEvent } from "./events/boss-split-event";
import { GameMessageEvent } from "./events/game-message-event";
import { UserBannedEvent } from "./events/user-banned-event";
import { VersionMismatchEvent } from "./events/version-mismatch-event";
import { AuthRequiredEvent } from "./events/auth-required-event";
import { ProfileLoadFailedEvent } from "./events/profile-load-failed-event";
import { PlayerLevelUpEvent } from "./events/player-level-up-event";
import { AuctionSnapshotEvent } from "./events/auction-snapshot-event";
import { DuplicateActiveSessionEvent } from "./events/duplicate-active-session-event";
import {
  serializeEvent,
  deserializeEvent,
  type IBufferWriter,
} from "../shared-event-serialization";

const SERVER_EVENT_VALUES = new Set<string>(Object.values(ServerSentEvents));

function isServerSentEvent(event: string): event is ServerSentEventType {
  return SERVER_EVENT_VALUES.has(event);
}

// Registry mapping event strings to event classes with serialization methods
const eventRegistry: Record<string, IBufferWriter> = {
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
  [ServerSentEvents.ZOMBIE_ALERTED]: ZombieAlertedEvent,
  [ServerSentEvents.BIG_ZOMBIE_DEATH]: BigZombieDeathEvent,
  [ServerSentEvents.BIG_ZOMBIE_HURT]: BigZombieHurtEvent,
  [ServerSentEvents.BIG_ZOMBIE_ATTACKED]: BigZombieAttackedEvent,
  [ServerSentEvents.PLAYER_HURT]: PlayerHurtEvent,
  [ServerSentEvents.PLAYER_ATTACKED]: PlayerAttackedEvent,
  [ServerSentEvents.GAME_STARTED]: GameStartedEvent,
  [ServerSentEvents.SERVER_UPDATING]: ServerUpdatingEvent,
  [ServerSentEvents.EXPLOSION]: ExplosionEvent,
  [ServerSentEvents.CAR_REPAIR]: CarRepairEvent,
  [ServerSentEvents.BUILD]: BuildEvent,
  [ServerSentEvents.BOSS_STEP]: BossStepEvent,
  [ServerSentEvents.BOSS_SUMMON]: BossSummonEvent,
  [ServerSentEvents.BOSS_SPLIT]: BossSplitEvent,
  [ServerSentEvents.GAME_MESSAGE]: GameMessageEvent,
  [ServerSentEvents.USER_BANNED]: UserBannedEvent,
  [ServerSentEvents.VERSION_MISMATCH]: VersionMismatchEvent,
  [ServerSentEvents.AUTH_REQUIRED]: AuthRequiredEvent,
  [ServerSentEvents.PROFILE_LOAD_FAILED]: ProfileLoadFailedEvent,
  [ServerSentEvents.PLAYER_LEVEL_UP]: PlayerLevelUpEvent,
  [ServerSentEvents.AUCTION_SNAPSHOT]: AuctionSnapshotEvent,
  [ServerSentEvents.DUPLICATE_ACTIVE_SESSION]: DuplicateActiveSessionEvent,
};

/**
 * Serialize a server-sent event to a Buffer (for server-side use)
 * Returns null if the event should be sent as JSON instead
 */
export function serializeServerEvent(event: string, args: any[]): Buffer | null {
  return serializeEvent(
    event,
    args,
    eventRegistry,
    isServerSentEvent,
    (size) => new BufferWriter(size),
    1024
  );
}

/**
 * Deserialize a server-sent event from an ArrayBuffer (for client-side use)
 * Returns null if the event should be deserialized as JSON instead
 */
export function deserializeServerEvent(event: string, buffer: ArrayBuffer): any[] | null {
  return deserializeEvent(event, buffer, eventRegistry, isServerSentEvent);
}
