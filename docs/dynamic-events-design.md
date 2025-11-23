# Dynamic Events System Design

## Overview

Dynamic Events are random, time-limited objectives that spawn during the **Preparation Phase** to add variety, urgency, and strategic decision-making to the game. They create interesting trade-offs between preparation time and potential rewards.

## Core Design Principles

1. **Preparation Phase Only**: Events spawn during PREPARATION phase, not during active waves
2. **Time-Limited**: Most events have expiration timers (typically 30-45 seconds)
3. **Risk/Reward**: Events offer meaningful rewards but require time/resources
4. **Non-Blocking**: Events are optional - players can ignore them without penalty
5. **Visual Clarity**: Events are clearly communicated via UI and map markers

## Event Categories

### 1. Resource Events

Events that spawn additional resources or resource-gathering opportunities.

#### Air Drop

- **Trigger**: Random chance (15-20%) during prep phase
- **Mechanics**:
  - Supply crate falls from sky at random location (marked on map)
  - Crate contains 5-8 random items (better loot than normal crates)
  - Crate lands after 5 second delay (visual indicator shows landing spot)
- **Duration**: Crate despawns after 30 seconds if not opened
- **Reward**: High-tier items, weapons, ammo
- **UI**: Map marker with pulsing effect, countdown timer

#### Resource Surge

- **Trigger**: Random chance (10-15%) during prep phase
- **Mechanics**:
  - Temporary resource nodes spawn around the map (3-5 nodes)
  - Each node provides 2x normal resource yield
  - Nodes glow/particle effect to indicate special status
- **Duration**: Nodes despawn after 45 seconds
- **Reward**: Double wood/cloth from each node
- **UI**: Special particle effect, "Resource Surge Active" message

#### Merchant Sale

- **Trigger**: Random chance (12-18%) during prep phase
- **Mechanics**:
  - All merchant items are 50% off for this prep phase only
  - Applies to all players simultaneously
- **Duration**: Entire prep phase
- **Reward**: Cheaper weapons/items from merchant
- **UI**: "MERCHANT SALE!" banner, discounted prices shown in merchant UI

### 2. Challenge Events

Events that require player action to complete for rewards.

#### Speed Challenge

- **Trigger**: Random chance (8-12%) during prep phase
- **Mechanics**:
  - Objective: "Kill 10 zombies before next wave starts"
  - Special zombie spawns appear (marked on map)
  - Players must hunt these zombies during prep phase
  - Zombies are weaker but give bonus gold/resources
- **Duration**: Until wave starts or objective completed
- **Reward**: Bonus gold (50-100) + extra resources
- **UI**: Progress counter, map markers for zombie locations

#### Scavenger Hunt

- **Trigger**: Random chance (10-15%) during prep phase
- **Mechanics**:
  - 3-5 special items spawn at random locations
  - Items are marked on map with waypoints
  - Players must collect all items before timer expires
- **Duration**: 40 seconds
- **Reward**: Rare weapon/item for each player who completes it
- **UI**: Map waypoints, progress tracker, countdown timer

#### Time Extension Challenge

- **Trigger**: Random chance (5-8%) during prep phase
- **Mechanics**:
  - Complete mini-objective to add time to prep phase
  - Objective: "Build 5 walls" or "Craft 3 items" or "Kill 5 zombies"
  - Progress tracked server-wide (all players contribute)
- **Duration**: 20 seconds to complete
- **Reward**: +30 seconds added to prep phase timer
- **UI**: Progress bar, objective description, time bonus indicator

### 3. Threat Events

Events that modify the next wave but offer compensation.

#### Horde Warning

- **Trigger**: Random chance (8-12%) during prep phase
- **Mechanics**:
  - Next wave will spawn 2x zombies
  - But each zombie kill gives 2x gold/resources
  - Players can prepare accordingly
- **Duration**: Affects next wave only
- **Reward**: Double rewards from zombie kills
- **UI**: Warning message, "HORDE INCOMING" banner, modified wave preview

#### Elite Wave

- **Trigger**: Random chance (6-10%) during prep phase
- **Mechanics**:
  - Next wave spawns only upgraded zombie variants
  - No basic zombies, all are Fast/Big/Spitter/etc.
  - Better loot drops from all zombies
- **Duration**: Affects next wave only
- **Reward**: Guaranteed item drops from each zombie
- **UI**: "ELITE WAVE" warning, zombie type preview

#### Dark Wave

- **Trigger**: Random chance (5-8%) during prep phase
- **Mechanics**:
  - Next wave has reduced visibility (darker lighting)
  - Zombies spawn closer to base
  - Players get bonus gold for surviving
- **Duration**: Affects next wave only
- **Reward**: +100 gold bonus if wave completed
- **UI**: Darkness warning, lighting preview

### 4. Special Spawn Events

Events that spawn special entities or NPCs.

#### Lost Survivor

- **Trigger**: Random chance (10-15%) during prep phase
- **Mechanics**:
  - NPC survivor spawns at random location (marked on map)
  - Players must reach survivor and interact to "rescue"
  - Survivor gives quest/reward when rescued
  - Survivor despawns if not rescued before wave starts
- **Duration**: Until wave starts or rescued
- **Reward**: Random high-tier item, bonus gold (100-200)
- **UI**: Map marker, "Survivor needs help!" message, interaction prompt

#### Mystery Crate

- **Trigger**: Random chance (8-12%) during prep phase
- **Mechanics**:
  - Special crate spawns at random location
  - Crate has question mark icon (unknown contents)
  - Could contain amazing loot OR trap (explosive, spawns zombies)
  - 70% chance good loot, 30% chance trap
- **Duration**: Until opened or wave starts
- **Reward**: High risk/reward gamble
- **UI**: Question mark icon, warning message about risk

## Technical Implementation

### Event System Architecture

```typescript
// Event types enum
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

// Event state
export interface DynamicEvent {
  id: string;
  type: DynamicEventType;
  startTime: number;
  endTime: number;
  data: Record<string, any>; // Event-specific data
  active: boolean;
}

// Event manager
export class DynamicEventManager {
  private activeEvents: Map<string, DynamicEvent> = new Map();
  private eventConfig: DynamicEventConfig;

  // Called during preparation phase
  public rollForEvents(waveNumber: number, waveState: WaveState): void {
    if (waveState !== WaveState.PREPARATION) return;

    // Roll for each event type based on probability
    Object.entries(this.eventConfig.events).forEach(([type, config]) => {
      if (this.shouldTrigger(config, waveNumber)) {
        this.triggerEvent(type as DynamicEventType, waveNumber);
      }
    });
  }

  private triggerEvent(type: DynamicEventType, waveNumber: number): void {
    const event = this.createEvent(type, waveNumber);
    this.activeEvents.set(event.id, event);
    this.broadcastEventStart(event);
  }

  public update(deltaTime: number): void {
    // Check for expired events, update event timers, etc.
    this.activeEvents.forEach((event, id) => {
      if (Date.now() >= event.endTime && event.active) {
        this.endEvent(id);
      }
    });
  }
}
```

### Integration Points

#### 1. Game Loop Integration

```typescript
// In GameLoop.onPreparationStart()
private onPreparationStart(): void {
  // ... existing code ...

  // Roll for dynamic events
  this.dynamicEventManager.rollForEvents(this.waveNumber, this.waveState);
}

// In GameLoop.update()
private update(): void {
  // ... existing code ...

  // Update dynamic events
  this.dynamicEventManager.update(deltaTime);
}
```

#### 2. Wave System Integration

```typescript
// Modify wave spawning based on active events
private spawnZombies(waveNumber: number): void {
  const hordeEvent = this.dynamicEventManager.getActiveEvent(DynamicEventType.HORDE_WARNING);
  const multiplier = hordeEvent ? 2 : 1;

  // Spawn zombies with multiplier
  this.mapManager.spawnZombies(waveNumber * multiplier);
}
```

#### 3. Event Broadcasting

```typescript
// New event type in events.ts
DYNAMIC_EVENT_START: "dynamicEventStart",
DYNAMIC_EVENT_UPDATE: "dynamicEventUpdate",
DYNAMIC_EVENT_END: "dynamicEventEnd",
```

### Configuration System

```typescript
// config/dynamic-events-config.ts
export const dynamicEventsConfig = {
  // Base probability modifiers
  BASE_PROBABILITY: 0.1, // 10% base chance per prep phase

  // Event-specific configurations
  events: {
    [DynamicEventType.AIR_DROP]: {
      probability: 0.15, // 15% chance per prep phase
      minWave: 2, // Can't trigger before wave 2
      maxWave: null, // No max wave limit
      duration: 30000, // 30 seconds
      cooldown: 2, // Can't trigger again for 2 waves
    },
    [DynamicEventType.MERCHANT_SALE]: {
      probability: 0.12,
      minWave: 1,
      maxWave: null,
      duration: null, // Lasts entire prep phase
      cooldown: 3,
      discountPercent: 50,
    },
    // ... other events
  },

  // Global settings
  maxConcurrentEvents: 2, // Max 2 events at once
  waveScaling: true, // Events become more common at higher waves
};
```

## UI/UX Design

### Event Notification System

#### 1. Event Banner (Top of Screen)

- Large, colorful banner appears when event starts
- Shows event name, description, timer
- Auto-dismisses after 5 seconds or can be manually closed
- Different colors per event category:
  - Resource Events: Green
  - Challenge Events: Blue
  - Threat Events: Red
  - Special Spawns: Purple

#### 2. Event Panel (Sidebar)

- Persistent panel showing active events
- Progress bars for challenge events
- Countdown timers
- Quick action buttons (e.g., "Show on Map")

#### 3. Map Markers

- Visual indicators for event locations
- Different icons per event type
- Pulsing/glowing effects for visibility
- Click to focus camera on location

#### 4. Event Completion Feedback

- Success/failure messages
- Reward notifications
- Sound effects for event completion

## Event Examples in Detail

### Example 1: Air Drop Event

**Flow:**

1. Event triggers at 30 seconds into prep phase
2. Server selects random valid ground position
3. Broadcast `DYNAMIC_EVENT_START` with event data
4. Client shows banner: "AIR DROP INCOMING!"
5. Visual indicator appears at landing spot (pulsing circle)
6. After 5 seconds, crate entity spawns at location
7. Crate has special visual (parachute, glow effect)
8. Crate contains 6 random high-tier items
9. Crate despawns after 30 seconds if not opened
10. Event ends, broadcast `DYNAMIC_EVENT_END`

**Server Code:**

```typescript
private triggerAirDrop(waveNumber: number): void {
  const eventId = `air_drop_${Date.now()}`;
  const landingPosition = this.mapManager.getRandomValidPosition();

  // Create event
  const event: DynamicEvent = {
    id: eventId,
    type: DynamicEventType.AIR_DROP,
    startTime: Date.now(),
    endTime: Date.now() + 35000, // 35 seconds total
    data: {
      landingPosition: { x: landingPosition.x, y: landingPosition.y },
      crateId: null, // Will be set when crate spawns
    },
    active: true,
  };

  // Broadcast event start
  this.broadcastEvent(new DynamicEventStartEvent({
    eventId,
    eventType: DynamicEventType.AIR_DROP,
    data: event.data,
  }));

  // Schedule crate spawn after 5 seconds
  setTimeout(() => {
    const crate = this.spawnSpecialCrate(landingPosition, 6);
    event.data.crateId = crate.getId();
  }, 5000);

  this.activeEvents.set(eventId, event);
}
```

### Example 2: Merchant Sale Event

**Flow:**

1. Event triggers at start of prep phase
2. Broadcast event start
3. Merchant entity updates its prices (50% discount)
4. Client UI shows "MERCHANT SALE!" banner
5. Merchant buy panel shows discounted prices
6. Event lasts entire prep phase
7. When wave starts, prices return to normal
8. Event ends

**Server Code:**

```typescript
private triggerMerchantSale(waveNumber: number): void {
  const eventId = `merchant_sale_${Date.now()}`;

  const event: DynamicEvent = {
    id: eventId,
    type: DynamicEventType.MERCHANT_SALE,
    startTime: Date.now(),
    endTime: Date.now() + (getConfig().wave.PREPARATION_DURATION * 1000),
    data: {
      discountPercent: 50,
    },
    active: true,
  };

  // Apply discount to all merchants
  const merchants = this.entityManager.getEntitiesByType(Entities.MERCHANT);
  merchants.forEach(merchant => {
    if (merchant instanceof Merchant) {
      merchant.setDiscountPercent(50);
    }
  });

  this.broadcastEvent(new DynamicEventStartEvent({
    eventId,
    eventType: DynamicEventType.MERCHANT_SALE,
    data: event.data,
  }));

  this.activeEvents.set(eventId, event);
}
```

## Balancing Considerations

### Probability Scaling

- Early waves (1-5): Lower event probability (5-10%)
- Mid waves (6-15): Medium probability (10-15%)
- Late waves (16+): Higher probability (15-20%)

### Cooldown System

- Each event type has a cooldown period
- Prevents same event from triggering too frequently
- Cooldown scales with wave number

### Concurrent Event Limits

- Maximum 2 events active at once
- If limit reached, new events are queued or skipped
- Prevents overwhelming players

### Reward Scaling

- Event rewards scale with wave number
- Early waves: Smaller rewards
- Late waves: Larger rewards
- Maintains challenge/reward balance

## Future Expansion Ideas

1. **Player-Voted Events**: Players vote on which event to trigger
2. **Seasonal Events**: Special events tied to holidays/seasons
3. **Boss Events**: Special events that spawn unique bosses
4. **Cooperative Events**: Events requiring team coordination
5. **Event Chains**: Completing one event unlocks another
6. **Personal Events**: Events that only affect one player
7. **Negative Events**: Events that add challenge (e.g., "Equipment Malfunction")

## Implementation Phases

### Phase 1: Core System (MVP)

- Event manager infrastructure
- Basic event triggering system
- 3 simple events: Air Drop, Merchant Sale, Resource Surge
- Basic UI notifications

### Phase 2: Challenge Events

- Speed Challenge
- Scavenger Hunt
- Time Extension Challenge
- Progress tracking UI

### Phase 3: Threat Events

- Horde Warning
- Elite Wave
- Dark Wave
- Wave modification system

### Phase 4: Special Spawns

- Lost Survivor NPC
- Mystery Crate
- Entity spawning system

### Phase 5: Polish

- Advanced UI/UX
- Sound effects
- Particle effects
- Balance tuning

