# Dynamic Events - Quick Reference

## Overview

Dynamic Events are random, time-limited objectives that spawn during the **Preparation Phase** to add variety and strategic depth to the game.

## Event Categories

### 🟢 Resource Events (Green)
- **Air Drop**: Supply crate falls from sky with high-tier loot
- **Resource Surge**: Temporary 2x resource nodes spawn
- **Merchant Sale**: 50% discount on all merchant items

### 🔵 Challenge Events (Blue)
- **Speed Challenge**: Kill zombies during prep phase for bonus rewards
- **Scavenger Hunt**: Collect special items from marked locations
- **Time Extension**: Complete objective to add 30s to prep phase

### 🔴 Threat Events (Red)
- **Horde Warning**: Next wave has 2x zombies, but 2x rewards
- **Elite Wave**: Next wave spawns only upgraded zombies
- **Dark Wave**: Next wave has reduced visibility

### 🟣 Special Spawns (Purple)
- **Lost Survivor**: Rescue NPC for rare rewards
- **Mystery Crate**: High-risk/high-reward gamble crate

## Key Design Principles

1. **Preparation Phase Only**: Events only trigger during PREPARATION
2. **Time-Limited**: Most events expire in 30-45 seconds
3. **Non-Blocking**: Events are optional - ignore without penalty
4. **Risk/Reward**: Meaningful rewards require time/resources
5. **Visual Clarity**: Clear UI notifications and map markers

## Implementation Checklist

### Phase 1: Core System ✅
- [ ] Add event types to `events.ts`
- [ ] Create `DynamicEventStartEvent` class
- [ ] Create `DynamicEventEndEvent` class
- [ ] Create `dynamic-events-config.ts`
- [ ] Create `DynamicEventManager` class
- [ ] Integrate with `GameLoop`

### Phase 2: First Event (Air Drop) ✅
- [ ] Implement Air Drop event logic
- [ ] Add map marker system
- [ ] Create event banner UI
- [ ] Add sound effects
- [ ] Test and balance

### Phase 3: More Events ✅
- [ ] Merchant Sale
- [ ] Resource Surge
- [ ] Horde Warning

### Phase 4: Challenge Events ✅
- [ ] Speed Challenge
- [ ] Scavenger Hunt
- [ ] Time Extension

### Phase 5: Polish ✅
- [ ] Advanced UI/UX
- [ ] Particle effects
- [ ] Balance tuning
- [ ] Achievement integration

## Configuration Example

```typescript
{
  AIR_DROP: {
    probability: 0.15,      // 15% chance per prep phase
    minWave: 2,            // Can't trigger before wave 2
    duration: 35000,       // 35 seconds
    cooldown: 2,          // 2 wave cooldown
    itemCount: 6,         // 6 items in crate
  }
}
```

## Event Flow

```
Preparation Phase Starts
    ↓
Roll for Events (based on probability)
    ↓
Event Triggers → Broadcast Event Start
    ↓
Event Active (duration timer)
    ↓
Event Ends → Broadcast Event End
    ↓
Cleanup & Cooldown
```

## Files to Create/Modify

### New Files
- `packages/game-shared/src/events/server-sent/events/dynamic-event-start-event.ts`
- `packages/game-shared/src/events/server-sent/events/dynamic-event-end-event.ts`
- `packages/game-shared/src/config/dynamic-events-config.ts`
- `packages/game-server/src/managers/dynamic-event-manager.ts`
- `packages/game-client/src/events/on-dynamic-event-start.ts`
- `packages/game-client/src/events/on-dynamic-event-end.ts`

### Modified Files
- `packages/game-shared/src/events/events.ts` (add event types)
- `packages/game-server/src/core/game-loop.ts` (integrate manager)
- `packages/game-client/src/client-event-listener.ts` (add listeners)
- `packages/game-shared/src/events/server-sent/server-event-serialization.ts` (register events)

## Testing Strategy

1. **Unit Tests**: Test event probability, cooldowns, timing
2. **Integration Tests**: Test event triggering during prep phase
3. **Balance Tests**: Verify rewards are appropriate
4. **UI Tests**: Ensure notifications display correctly
5. **Performance Tests**: Check impact on game loop

## Balance Considerations

- **Early Waves (1-5)**: Lower probability (5-10%)
- **Mid Waves (6-15)**: Medium probability (10-15%)
- **Late Waves (16+)**: Higher probability (15-20%)
- **Cooldowns**: Prevent same event too frequently
- **Max Concurrent**: Limit to 2 events at once

## Future Ideas

- Player-voted events
- Seasonal events
- Boss events
- Cooperative events
- Event chains
- Personal events
- Negative events (challenges)


