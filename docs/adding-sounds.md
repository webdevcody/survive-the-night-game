# Adding Sounds to Survive the Night

This guide documents the complete process for adding a new sound effect to the game.

## Overview

Sounds in the game are managed through the `SoundManager` class, which handles loading, caching, and playing positional audio. There are two main scenarios for adding sounds:

1. **Event-triggered sounds** - Sounds that play when a specific game event occurs (e.g., car repair, player death)
2. **Direct playback sounds** - Sounds that are played directly from game logic (e.g., weapon firing, walking)

## Quick Start: Simple Sound (Direct Playback)

If your sound is triggered directly from game logic (like a weapon firing), you only need:

### 1. Add Sound Type

**File:** `packages/game-client/src/managers/sound-manager.ts`

```typescript
export const SOUND_TYPES_TO_MP3 = {
  // ... existing sounds ...
  MY_SOUND: "my_sound",
} as const;
```

### 2. Add Sound File

Place `my_sound.mp3` in `packages/website/public/sounds/`

### 3. Play the Sound

**File:** Wherever you need to play the sound (e.g., weapon class, player class)

```typescript
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";

// Get the sound manager from game client
const soundManager = this.gameClient.getSoundManager();
const position = entity.getExt(ClientPositionable).getCenterPosition();
soundManager.playPositionalSound(SOUND_TYPES_TO_MP3.MY_SOUND, position);
```

**That's it!** The sound will automatically:
- ✅ Load when the game starts
- ✅ Play with positional audio (volume based on distance)
- ✅ Respect mute settings

## Complete Guide: Event-Triggered Sounds

If your sound should play when a specific game event occurs (like car repair, item pickup), follow these steps:

### 1. Add Sound Type

**File:** `packages/game-client/src/managers/sound-manager.ts`

```typescript
export const SOUND_TYPES_TO_MP3 = {
  // ... existing sounds ...
  MY_SOUND: "my_sound",
} as const;
```

### 2. Add Sound File

Place `my_sound.mp3` in `packages/website/public/sounds/`

### 3. Create Event Class (game-shared package)

**File:** `packages/game-shared/src/events/server-sent/my-sound-event.ts`

```typescript
import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class MySoundEvent implements GameEvent<string> {
  private readonly type: EventType;
  private readonly entityId: number;

  constructor(entityId: number) {
    this.type = ServerSentEvents.MY_SOUND;
    this.entityId = entityId;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): string {
    return this.entityId;
  }

  getEntityId(): string {
    return this.entityId;
  }
}
```

**Note:** The event structure depends on what data you need. For simple cases, you might just need an entity ID. For more complex cases, you might need position data or other information.

### 4. Add Event to ServerSentEvents Enum

**File:** `packages/game-shared/src/events/events.ts`

```typescript
export const ServerSentEvents = {
  // ... existing events ...
  MY_SOUND: "mySound",
} as const;
```

### 5. Send Event from Server

**File:** Wherever the event should be triggered (e.g., `packages/game-server/src/entities/environment/car.ts`)

```typescript
import { MySoundEvent } from "@shared/events/server-sent/my-sound-event";

// When the event should occur:
this.getGameManagers()
  .getBroadcaster()
  .broadcastEvent(new MySoundEvent(this.getId()));
```

### 6. Register Event in Client Socket Manager

**File:** `packages/game-client/src/managers/client-socket-manager.ts`

#### A. Import the Event Class

```typescript
import { MySoundEvent } from "@shared/events/server-sent/my-sound-event";
```

#### B. Add to SERVER_EVENT_MAP

```typescript
const SERVER_EVENT_MAP = {
  // ... existing events ...
  [ServerSentEvents.MY_SOUND]: MySoundEvent,
} as const;
```

### 7. Handle Event in Client Event Listener

**File:** `packages/game-client/src/client-event-listener.ts`

#### A. Import the Event Class

```typescript
import { MySoundEvent } from "@shared/events/server-sent/my-sound-event";
```

#### B. Register Event Handler in Constructor

```typescript
constructor(client: GameClient, socketManager: ClientSocketManager) {
  // ... existing code ...
  this.socketManager.on(ServerSentEvents.MY_SOUND, this.onMySound.bind(this));
}
```

#### C. Implement Event Handler

```typescript
onMySound(mySoundEvent: MySoundEvent) {
  const entity = this.gameClient.getEntityById(mySoundEvent.getEntityId());
  if (!entity || !entity.hasExt(ClientPositionable)) return;

  const position = entity.getExt(ClientPositionable).getCenterPosition();
  this.gameClient
    .getSoundManager()
    .playPositionalSound(SOUND_TYPES_TO_MP3.MY_SOUND, position);
}
```

## Sound Volume Configuration

You can optionally configure base volume levels for sounds:

**File:** `packages/game-client/src/managers/sound-manager.ts`

```typescript
export const SOUND_VOLUME_MAP: Partial<Record<SoundType, number>> = {
  // ... existing volumes ...
  my_sound: 0.7, // 70% volume (0.0 to 1.0)
} as const;
```

If a sound is not in this map, it defaults to 1.0 (100% volume).

## Positional Audio

All sounds use positional audio, which means:
- Volume decreases with distance from the player
- Maximum distance is 400 units (configurable via `SoundManager.MAX_DISTANCE`)
- Volume calculation uses linear falloff

The sound manager automatically calculates volume based on:
1. Base volume (from `SOUND_VOLUME_MAP` or 1.0)
2. Distance falloff (linear interpolation from max distance)
3. Debug volume reduction (if enabled)

## Complete File Checklist

### Simple Sound (Direct Playback)

- [x] `packages/game-client/src/managers/sound-manager.ts` - Add sound type to `SOUND_TYPES_TO_MP3`
- [x] `packages/website/public/sounds/[sound-name].mp3` - Add sound file
- [x] Code location - Call `playPositionalSound()` with sound type and position

**That's it!** No event system needed.

### Event-Triggered Sound

#### Shared Package
- [x] `packages/game-shared/src/events/server-sent/[event-name]-event.ts` - Create event class
- [x] `packages/game-shared/src/events/events.ts` - Add event to `ServerSentEvents` enum

#### Server Package
- [x] `packages/game-server/src/entities/[location].ts` - Send event when action occurs

#### Client Package
- [x] `packages/game-client/src/managers/client-socket-manager.ts` - Import event and add to `SERVER_EVENT_MAP`
- [x] `packages/game-client/src/client-event-listener.ts` - Import event, register handler, implement handler
- [x] `packages/game-client/src/managers/sound-manager.ts` - Add sound type to `SOUND_TYPES_TO_MP3`
- [x] `packages/website/public/sounds/[sound-name].mp3` - Add sound file

## Example: Car Repair Sound

The car repair sound serves as a complete reference implementation. Key files:

- **Event class:** `packages/game-shared/src/events/server-sent/car-repair-event.ts`
- **Server trigger:** `packages/game-server/src/entities/environment/car.ts` (onRepair method)
- **Client handler:** `packages/game-client/src/client-event-listener.ts` (onCarRepair method)
- **Sound type:** `packages/game-client/src/managers/sound-manager.ts` (REPAIR: "repair")
- **Sound file:** `packages/website/public/sounds/repair.mp3`

**Key Features:**
- Event is sent from server when car repair occurs
- Client receives event and plays sound at car's position
- Sound uses positional audio (louder when closer to car)

## Example: Coin Pickup Sound

The coin pickup sound is another good example:

- **Event class:** `packages/game-shared/src/events/server-sent/coin-pickup-event.ts`
- **Server trigger:** `packages/game-server/src/entities/items/coin.ts`
- **Client handler:** `packages/game-client/src/client-event-listener.ts` (onCoinPickup method)
- **Sound type:** `packages/game-client/src/managers/sound-manager.ts` (COIN_PICKUP: "coin_pickup")
- **Sound file:** `packages/website/public/sounds/coin_pickup.mp3`

## When to Use Events vs Direct Playback

### Use Events When:
- ✅ Sound should play for all players (not just the one performing the action)
- ✅ Sound is triggered by server-side logic
- ✅ Sound needs to be synchronized across clients
- ✅ Sound is part of a game event system

**Examples:** Car repair, explosions, player deaths, item pickups

### Use Direct Playback When:
- ✅ Sound is only for the local player
- ✅ Sound is triggered by client-side input
- ✅ Sound doesn't need server synchronization

**Examples:** Weapon firing (already handled by weapon config), UI sounds, local feedback

## Sound File Requirements

- **Format:** MP3
- **Location:** `packages/website/public/sounds/[sound-name].mp3`
- **Naming:** Use lowercase with underscores (e.g., `my_sound.mp3`)
- **Naming Convention:** Match the value in `SOUND_TYPES_TO_MP3` exactly

## Testing Checklist

- [ ] Sound file exists in `packages/website/public/sounds/`
- [ ] Sound type added to `SOUND_TYPES_TO_MP3`
- [ ] Sound plays at correct position (if positional)
- [ ] Sound volume is appropriate
- [ ] Sound respects mute settings
- [ ] Sound plays for all players (if event-triggered)
- [ ] Sound doesn't play multiple times unintentionally
- [ ] Sound file loads without errors (check browser console)

## Troubleshooting

### Sound doesn't play

- Verify sound file exists in `packages/website/public/sounds/`
- Check that sound name in `SOUND_TYPES_TO_MP3` matches filename (without `.mp3`)
- Ensure sound file is actually being loaded (check browser console for errors)
- Verify `playPositionalSound()` is being called with correct parameters
- Check that entity has `ClientPositionable` extension (for positional sounds)

### Sound plays but no audio

- Check browser console for audio playback errors
- Verify sound file is valid MP3 format
- Check browser autoplay policies (some browsers block autoplay)
- Ensure sound manager is not muted (`getMuteState()`)

### Sound volume is too loud/quiet

- Adjust volume in `SOUND_VOLUME_MAP` (0.0 to 1.0)
- Check distance from sound source (positional audio)
- Verify `DEBUG_VOLUME_REDUCTION` is not affecting volume

### Event-triggered sound doesn't play

- Verify event is being sent from server (`broadcastEvent()`)
- Check event is registered in `SERVER_EVENT_MAP`
- Ensure event handler is registered in `ClientEventListener` constructor
- Verify event handler implementation is correct
- Check browser console for event deserialization errors

### Sound plays multiple times

- Check if event is being broadcast multiple times
- Verify event handler isn't registered multiple times
- Check for duplicate sound playback calls in code

### Type errors

- Verify sound type is added to `SOUND_TYPES_TO_MP3`
- Check that `SoundType` includes your new sound
- Ensure imports are correct
- Verify event class implements `GameEvent` interface correctly

## Advanced: Looping Sounds

For sounds that need to loop (like walking/running), use `updateLoopingSound()`:

```typescript
// Start/update looping sound
soundManager.updateLoopingSound(playerId, SOUND_TYPES_TO_MP3.WALK, position);

// Stop looping sound
soundManager.updateLoopingSound(playerId, null, position);
```

See `packages/game-client/src/client.ts` (`updatePlayerMovementSounds` method) for a complete example.

## Sound Manager API Reference

### `playPositionalSound(sound: SoundType, position: Vector2)`
Plays a one-time sound at a specific position with distance-based volume.

### `updateLoopingSound(playerId: number, soundType: SoundType | null, position: Vector2)`
Updates or starts a looping sound for a player. Set `soundType` to `null` to stop.

### `stopLoopingSound(playerId: number)`
Stops a looping sound for a specific player.

### `toggleMute()`
Toggles mute state for all sounds.

### `getMuteState(): boolean`
Returns current mute state.

### `preloadSounds(onProgress?: SoundLoadProgressCallback): Promise<void>`
Preloads all sounds. Called automatically on game start.

