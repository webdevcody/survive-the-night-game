# Dynamic Events Implementation Guide

This guide provides concrete implementation examples following the existing codebase patterns.

## Step 1: Add Event Types

### Update `packages/game-shared/src/events/events.ts`

```typescript
export const ServerSentEvents = {
  // ... existing events ...
  DYNAMIC_EVENT_START: "dynamicEventStart",
  DYNAMIC_EVENT_UPDATE: "dynamicEventUpdate",
  DYNAMIC_EVENT_END: "dynamicEventEnd",
} as const;
```

## Step 2: Create Event Classes

### Create `packages/game-shared/src/events/server-sent/events/dynamic-event-start-event.ts`

```typescript
import { GameEvent } from "@/events/types";
import { EventType, ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export enum DynamicEventType {
  AIR_DROP = "air_drop",
  RESOURCE_SURGE = "resource_surge",
  MERCHANT_SALE = "merchant_sale",
  SPEED_CHALLENGE = "speed_challenge",
  SCAVENGER_HUNT = "scavenger_hunt",
  TIME_EXTENSION = "time_extension",
  HORDE_WARNING = "horde_warning",
  ELITE_WAVE = "elite_wave",
  DARK_WAVE = "dark_wave",
  LOST_SURVIVOR = "lost_survivor",
  MYSTERY_CRATE = "mystery_crate",
}

export interface DynamicEventStartEventData {
  eventId: string;
  eventType: DynamicEventType;
  startTime: number;
  endTime: number;
  data: Record<string, any>;
}

export class DynamicEventStartEvent implements GameEvent<DynamicEventStartEventData> {
  private readonly type: EventType;
  private readonly data: DynamicEventStartEventData;

  constructor(data: DynamicEventStartEventData) {
    this.type = ServerSentEvents.DYNAMIC_EVENT_START;
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): DynamicEventStartEventData {
    return this.data;
  }

  getData(): DynamicEventStartEventData {
    return this.data;
  }

  getEventId(): string {
    return this.data.eventId;
  }

  getEventType(): DynamicEventType {
    return this.data.eventType;
  }

  static serializeToBuffer(writer: BufferWriter, data: DynamicEventStartEventData): void {
    writer.writeString(data.eventId);
    writer.writeString(data.eventType);
    writer.writeFloat64(data.startTime);
    writer.writeFloat64(data.endTime);
    // Serialize data object as JSON string (or use more efficient binary format)
    writer.writeString(JSON.stringify(data.data));
  }

  static deserializeFromBuffer(reader: BufferReader): DynamicEventStartEventData {
    const eventId = reader.readString();
    const eventType = reader.readString() as DynamicEventType;
    const startTime = reader.readFloat64();
    const endTime = reader.readFloat64();
    const dataJson = reader.readString();
    const data = JSON.parse(dataJson);
    return { eventId, eventType, startTime, endTime, data };
  }
}
```

### Create `packages/game-shared/src/events/server-sent/events/dynamic-event-end-event.ts`

```typescript
import { GameEvent } from "@/events/types";
import { EventType, ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { DynamicEventType } from "./dynamic-event-start-event";

export interface DynamicEventEndEventData {
  eventId: string;
  eventType: DynamicEventType;
  completed: boolean;
  rewards?: Record<string, any>;
}

export class DynamicEventEndEvent implements GameEvent<DynamicEventEndEventData> {
  private readonly type: EventType;
  private readonly data: DynamicEventEndEventData;

  constructor(data: DynamicEventEndEventData) {
    this.type = ServerSentEvents.DYNAMIC_EVENT_END;
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): DynamicEventEndEventData {
    return this.data;
  }

  getData(): DynamicEventEndEventData {
    return this.data;
  }

  static serializeToBuffer(writer: BufferWriter, data: DynamicEventEndEventData): void {
    writer.writeString(data.eventId);
    writer.writeString(data.eventType);
    writer.writeUInt8(data.completed ? 1 : 0);
    writer.writeString(JSON.stringify(data.rewards || {}));
  }

  static deserializeFromBuffer(reader: BufferReader): DynamicEventEndEventData {
    const eventId = reader.readString();
    const eventType = reader.readString() as DynamicEventType;
    const completed = reader.readUInt8() === 1;
    const rewardsJson = reader.readString();
    const rewards = JSON.parse(rewardsJson);
    return { eventId, eventType, completed, rewards };
  }
}
```

## Step 3: Create Configuration

### Create `packages/game-shared/src/config/dynamic-events-config.ts`

```typescript
import { DynamicEventType } from "../events/server-sent/events/dynamic-event-start-event";

export interface EventConfig {
  probability: number; // 0.0 to 1.0
  minWave: number;
  maxWave: number | null;
  duration: number | null; // milliseconds, null = entire prep phase
  cooldown: number; // waves before can trigger again
  [key: string]: any; // Event-specific config
}

export const dynamicEventsConfig = {
  BASE_PROBABILITY: 0.1,
  MAX_CONCURRENT_EVENTS: 2,
  WAVE_SCALING: true,

  events: {
    [DynamicEventType.AIR_DROP]: {
      probability: 0.15,
      minWave: 2,
      maxWave: null,
      duration: 35000, // 35 seconds
      cooldown: 2,
      itemCount: 6,
      landingDelay: 5000, // 5 seconds before crate lands
    },
    [DynamicEventType.MERCHANT_SALE]: {
      probability: 0.12,
      minWave: 1,
      maxWave: null,
      duration: null, // Entire prep phase
      cooldown: 3,
      discountPercent: 50,
    },
    [DynamicEventType.RESOURCE_SURGE]: {
      probability: 0.10,
      minWave: 1,
      maxWave: null,
      duration: 45000, // 45 seconds
      cooldown: 2,
      nodeCount: 4,
      resourceMultiplier: 2,
    },
    [DynamicEventType.HORDE_WARNING]: {
      probability: 0.10,
      minWave: 3,
      maxWave: null,
      duration: null, // Affects next wave
      cooldown: 4,
      zombieMultiplier: 2,
      rewardMultiplier: 2,
    },
    // Add more event configs...
  } as Record<DynamicEventType, EventConfig>,
} as const;
```

## Step 4: Create Event Manager

### Create `packages/game-server/src/managers/dynamic-event-manager.ts`

```typescript
import { DynamicEventType, DynamicEventStartEvent } from "@shared/events/server-sent/events/dynamic-event-start-event";
import { DynamicEventEndEvent } from "@shared/events/server-sent/events/dynamic-event-end-event";
import { dynamicEventsConfig } from "@shared/config/dynamic-events-config";
import { WaveState } from "@shared/types/wave";
import { EntityManager } from "./entity-manager";
import { MapManager } from "@/world/map-manager";
import { ServerSocketManager } from "./server-socket-manager";
import { Merchant } from "@/entities/environment/merchant";
import { Entities } from "@shared/constants";
import { Crate } from "@/entities/items/crate";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@shared/config";

export interface DynamicEvent {
  id: string;
  type: DynamicEventType;
  startTime: number;
  endTime: number;
  data: Record<string, any>;
  active: boolean;
  lastTriggeredWave: number;
}

export class DynamicEventManager {
  private activeEvents: Map<string, DynamicEvent> = new Map();
  private eventCooldowns: Map<DynamicEventType, number> = new Map();
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private socketManager: ServerSocketManager;
  private currentWaveNumber: number = 0;

  constructor(
    entityManager: EntityManager,
    mapManager: MapManager,
    socketManager: ServerSocketManager
  ) {
    this.entityManager = entityManager;
    this.mapManager = mapManager;
    this.socketManager = socketManager;
  }

  public setWaveNumber(waveNumber: number): void {
    this.currentWaveNumber = waveNumber;
  }

  /**
   * Called at the start of each preparation phase
   */
  public rollForEvents(waveNumber: number, waveState: WaveState): void {
    if (waveState !== WaveState.PREPARATION) return;

    // Clear expired events
    this.cleanupExpiredEvents();

    // Check if we can trigger more events
    if (this.activeEvents.size >= dynamicEventsConfig.MAX_CONCURRENT_EVENTS) {
      return;
    }

    // Roll for each event type
    Object.entries(dynamicEventsConfig.events).forEach(([type, config]) => {
      if (this.shouldTrigger(type as DynamicEventType, config, waveNumber)) {
        this.triggerEvent(type as DynamicEventType, waveNumber);
      }
    });
  }

  private shouldTrigger(
    eventType: DynamicEventType,
    config: any,
    waveNumber: number
  ): boolean {
    // Check wave range
    if (waveNumber < config.minWave) return false;
    if (config.maxWave !== null && waveNumber > config.maxWave) return false;

    // Check cooldown
    const lastTriggered = this.eventCooldowns.get(eventType) || 0;
    if (waveNumber - lastTriggered < config.cooldown) return false;

    // Check if already active
    for (const event of this.activeEvents.values()) {
      if (event.type === eventType && event.active) return false;
    }

    // Roll probability
    const probability = config.probability;
    if (dynamicEventsConfig.WAVE_SCALING) {
      // Scale probability with wave number (more events at higher waves)
      const scaledProbability = Math.min(probability * (1 + waveNumber * 0.05), 0.5);
      return Math.random() < scaledProbability;
    }
    return Math.random() < probability;
  }

  private triggerEvent(eventType: DynamicEventType, waveNumber: number): void {
    const config = dynamicEventsConfig.events[eventType];
    if (!config) return;

    const eventId = `${eventType}_${Date.now()}`;
    const now = Date.now();
    const duration = config.duration || (getConfig().wave.PREPARATION_DURATION * 1000);
    const endTime = now + duration;

    const event: DynamicEvent = {
      id: eventId,
      type: eventType,
      startTime: now,
      endTime: endTime,
      data: {},
      active: true,
      lastTriggeredWave: waveNumber,
    };

    // Event-specific initialization
    switch (eventType) {
      case DynamicEventType.AIR_DROP:
        this.initAirDrop(event, config);
        break;
      case DynamicEventType.MERCHANT_SALE:
        this.initMerchantSale(event, config);
        break;
      case DynamicEventType.RESOURCE_SURGE:
        this.initResourceSurge(event, config);
        break;
      case DynamicEventType.HORDE_WARNING:
        this.initHordeWarning(event, config);
        break;
      // Add more cases...
    }

    this.activeEvents.set(eventId, event);
    this.eventCooldowns.set(eventType, waveNumber);

    // Broadcast event start
    this.socketManager.broadcastEvent(
      new DynamicEventStartEvent({
        eventId,
        eventType,
        startTime: event.startTime,
        endTime: event.endTime,
        data: event.data,
      })
    );
  }

  private initAirDrop(event: DynamicEvent, config: any): void {
    const position = this.mapManager.getRandomValidPosition();
    event.data.landingPosition = { x: position.x, y: position.y };
    event.data.itemCount = config.itemCount;
    event.data.landingDelay = config.landingDelay;

    // Schedule crate spawn
    setTimeout(() => {
      if (!this.activeEvents.has(event.id)) return; // Event was cancelled

      const crate = new Crate(
        this.mapManager.getGameManagers(),
        undefined,
        config.itemCount
      );
      const pos = PoolManager.getInstance().vector2.claim(
        event.data.landingPosition.x,
        event.data.landingPosition.y
      );
      crate.getExt(Positionable).setPosition(pos);
      this.entityManager.addEntity(crate);
      event.data.crateId = crate.getId();
    }, config.landingDelay);
  }

  private initMerchantSale(event: DynamicEvent, config: any): void {
    event.data.discountPercent = config.discountPercent;

    // Apply discount to all merchants
    const merchants = this.entityManager.getEntitiesByType(Entities.MERCHANT);
    merchants.forEach((merchant) => {
      if (merchant instanceof Merchant) {
        // Assuming Merchant has a setDiscountPercent method
        // merchant.setDiscountPercent(config.discountPercent);
      }
    });
  }

  private initResourceSurge(event: DynamicEvent, config: any): void {
    event.data.nodeCount = config.nodeCount;
    event.data.resourceMultiplier = config.resourceMultiplier;
    // Spawn resource nodes would be handled here
  }

  private initHordeWarning(event: DynamicEvent, config: any): void {
    event.data.zombieMultiplier = config.zombieMultiplier;
    event.data.rewardMultiplier = config.rewardMultiplier;
    // This affects the next wave, so we store it for later
  }

  /**
   * Called each game tick to update events
   */
  public update(deltaTime: number): void {
    const now = Date.now();
    this.activeEvents.forEach((event, id) => {
      if (event.active && now >= event.endTime) {
        this.endEvent(id, false);
      }
    });
  }

  private endEvent(eventId: string, completed: boolean): void {
    const event = this.activeEvents.get(eventId);
    if (!event) return;

    event.active = false;

    // Event-specific cleanup
    switch (event.type) {
      case DynamicEventType.MERCHANT_SALE:
        // Reset merchant prices
        const merchants = this.entityManager.getEntitiesByType(Entities.MERCHANT);
        merchants.forEach((merchant) => {
          if (merchant instanceof Merchant) {
            // merchant.setDiscountPercent(0);
          }
        });
        break;
      // Add more cleanup cases...
    }

    // Broadcast event end
    this.socketManager.broadcastEvent(
      new DynamicEventEndEvent({
        eventId,
        eventType: event.type,
        completed,
      })
    );

    // Remove after a delay (to allow clients to process)
    setTimeout(() => {
      this.activeEvents.delete(eventId);
    }, 1000);
  }

  private cleanupExpiredEvents(): void {
    const now = Date.now();
    this.activeEvents.forEach((event, id) => {
      if (!event.active || now >= event.endTime + 5000) {
        // Keep events for 5 seconds after end for client processing
        this.activeEvents.delete(id);
      }
    });
  }

  /**
   * Get active event of a specific type
   */
  public getActiveEvent(eventType: DynamicEventType): DynamicEvent | undefined {
    for (const event of this.activeEvents.values()) {
      if (event.type === eventType && event.active) {
        return event;
      }
    }
    return undefined;
  }

  /**
   * Get multiplier for zombie spawns (for Horde Warning event)
   */
  public getZombieSpawnMultiplier(): number {
    const hordeEvent = this.getActiveEvent(DynamicEventType.HORDE_WARNING);
    return hordeEvent?.data.zombieMultiplier || 1;
  }

  /**
   * Get multiplier for zombie rewards (for Horde Warning event)
   */
  public getZombieRewardMultiplier(): number {
    const hordeEvent = this.getActiveEvent(DynamicEventType.HORDE_WARNING);
    return hordeEvent?.data.rewardMultiplier || 1;
  }
}
```

## Step 5: Integrate with Game Loop

### Update `packages/game-server/src/core/game-loop.ts`

```typescript
import { DynamicEventManager } from "@/managers/dynamic-event-manager";

export class GameLoop {
  // ... existing properties ...
  private dynamicEventManager: DynamicEventManager;

  constructor(
    tickPerformanceTracker: TickPerformanceTracker,
    entityManager: EntityManager,
    mapManager: MapManager,
    socketManager: ServerSocketManager
  ) {
    // ... existing code ...
    this.dynamicEventManager = new DynamicEventManager(
      entityManager,
      mapManager,
      socketManager
    );
  }

  private onPreparationStart(): void {
    // ... existing code ...
    
    // Roll for dynamic events
    this.dynamicEventManager.setWaveNumber(this.waveNumber);
    this.dynamicEventManager.rollForEvents(this.waveNumber, this.waveState);
  }

  private onWaveStart(): void {
    // ... existing code ...
    
    // Apply event modifiers to zombie spawning
    const zombieMultiplier = this.dynamicEventManager.getZombieSpawnMultiplier();
    this.mapManager.spawnZombies(this.waveNumber * zombieMultiplier);
  }

  private update(): void {
    // ... existing code ...
    
    // Update dynamic events
    this.dynamicEventManager.update(deltaTime);
  }
}
```

## Step 6: Client-Side Event Handling

### Create `packages/game-client/src/events/on-dynamic-event-start.ts`

```typescript
import { DynamicEventStartEvent } from "../../../game-shared/src/events/server-sent/events/dynamic-event-start-event";
import { ClientEventContext } from "./types";
import { DynamicEventType } from "../../../game-shared/src/events/server-sent/events/dynamic-event-start-event";

export const onDynamicEventStart = (
  context: ClientEventContext,
  event: DynamicEventStartEvent
) => {
  const data = event.getData();
  
  // Show event banner
  context.gameClient.getUIManager()?.showEventBanner({
    title: getEventTitle(data.eventType),
    description: getEventDescription(data.eventType, data.data),
    duration: data.endTime - data.startTime,
    color: getEventColor(data.eventType),
  });

  // Add map marker if event has a location
  if (data.data.landingPosition) {
    context.gameClient.getMapManager()?.addEventMarker({
      eventId: data.eventId,
      position: data.data.landingPosition,
      type: data.eventType,
    });
  }

  // Play sound effect
  context.gameClient.getSoundManager()?.playEventSound(data.eventType);
};

function getEventTitle(eventType: DynamicEventType): string {
  const titles: Record<DynamicEventType, string> = {
    [DynamicEventType.AIR_DROP]: "AIR DROP INCOMING!",
    [DynamicEventType.MERCHANT_SALE]: "MERCHANT SALE!",
    [DynamicEventType.RESOURCE_SURGE]: "RESOURCE SURGE!",
    [DynamicEventType.HORDE_WARNING]: "HORDE WARNING!",
    // ... more titles
  };
  return titles[eventType] || "EVENT";
}

function getEventDescription(eventType: DynamicEventType, data: any): string {
  switch (eventType) {
    case DynamicEventType.AIR_DROP:
      return "Supply crate landing soon! Check your map.";
    case DynamicEventType.MERCHANT_SALE:
      return `All items ${data.discountPercent}% off!`;
    case DynamicEventType.HORDE_WARNING:
      return "Next wave will be 2x zombies, but 2x rewards!";
    default:
      return "";
  }
}

function getEventColor(eventType: DynamicEventType): string {
  const colors: Record<DynamicEventType, string> = {
    [DynamicEventType.AIR_DROP]: "#00ff00", // Green
    [DynamicEventType.MERCHANT_SALE]: "#ffff00", // Yellow
    [DynamicEventType.RESOURCE_SURGE]: "#00ff00", // Green
    [DynamicEventType.HORDE_WARNING]: "#ff0000", // Red
    // ... more colors
  };
  return colors[eventType] || "#ffffff";
}
```

### Update `packages/game-client/src/client-event-listener.ts`

```typescript
import { onDynamicEventStart } from "./events/on-dynamic-event-start";
import { onDynamicEventEnd } from "./events/on-dynamic-event-end";
import { DynamicEventStartEvent } from "../../game-shared/src/events/server-sent/events/dynamic-event-start-event";
import { DynamicEventEndEvent } from "../../game-shared/src/events/server-sent/events/dynamic-event-end-event";

export class ClientEventListener {
  constructor(client: GameClient, socketManager: ClientSocketManager) {
    // ... existing listeners ...
    
    this.socketManager.on(
      ServerSentEvents.DYNAMIC_EVENT_START,
      (e) => onDynamicEventStart(context, e as DynamicEventStartEvent)
    );
    
    this.socketManager.on(
      ServerSentEvents.DYNAMIC_EVENT_END,
      (e) => onDynamicEventEnd(context, e as DynamicEventEndEvent)
    );
  }
}
```

## Step 7: Register Events in Serialization

### Update `packages/game-shared/src/events/server-sent/server-event-serialization.ts`

Add the new events to the serialization map so they can be properly serialized/deserialized.

## Next Steps

1. Implement UI components for event banners and markers
2. Add sound effects for each event type
3. Implement remaining event types one by one
4. Add visual effects (particles, animations)
5. Balance probabilities and rewards through playtesting


