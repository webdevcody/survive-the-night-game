# Client-Server Initialization Flow

## Overview

This document describes how clients initialize their game state when connecting to the server or when a new game starts. The system ensures clients receive their player ID and full game state in the correct order to avoid race conditions.

## Key Concepts

### Player ID (Entity ID)
- Each player has a unique `uint16` entity ID (not the socket ID)
- When a new game starts, all players get **new** entity IDs
- Clients must know their entity ID to identify their player in the game state

### Full Game State
- Contains all entities (players, enemies, items, etc.)
- Includes map data (ground tiles, collidables, biome positions)
- Includes wave system data (wave number, state, timing)
- Has a flag `isFullState: true` to distinguish from delta updates

### Delta Updates
- Sent every game tick with only changed entities
- Has `isFullState: false`
- Cannot be processed until client has received initial full state

## Initialization Requirements

The client must receive **both** of the following before processing game updates:
1. `YOUR_ID` event - tells the client their player's entity ID
2. Full game state (with `isFullState: true`)

The client tracks this with two flags:
- `hasReceivedPlayerId` - set when YOUR_ID is received
- `hasReceivedInitialState` - set when full state is processed

## Event Flow

### When a Player First Connects

```
Client                          Server
  |                               |
  |-------- connect ------------->|
  |                               | Creates player entity
  |                               | Adds to entity manager
  |<------- YOUR_ID --------------|  (player's entity ID)
  |<------- FULL_STATE -----------|  (all entities + map)
  |                               |
  | [Client now initialized]      |
  |                               |
  |<------- DELTA_UPDATE ---------|  (ongoing updates)
```

### When a New Game Starts

```
Client                          Server
  |                               |
  |                               | Clears all entities
  |                               | Generates new map
  |                               | Recreates players (NEW IDs!)
  |                               |
  |<------- GAME_STARTED ---------|
  |                               |
  | [Client resets state]         |
  | hasReceivedPlayerId = false   |
  | hasReceivedInitialState = false|
  |                               |
  |<------- YOUR_ID --------------|  (new entity ID)
  |<------- FULL_STATE -----------|  (new game state + map)
  |                               |
  | [Client now initialized]      |
```

### When Client Reconnects

```
Client                          Server
  |                               |
  |-------- reconnect ----------->|
  |                               | Finds existing player
  |                               |
  | [Client resets state]         |
  |------- REQUEST_PLAYER_ID ---->|
  |------- REQUEST_FULL_STATE --->|
  |                               |
  |<------- YOUR_ID --------------|
  |<------- FULL_STATE -----------|
  |                               |
  | [Client now initialized]      |
```

## Server Implementation

### `startNewGame()` in game-loop.ts
```typescript
public startNewGame(): void {
  // 1. Clear all entities
  this.entityManager.clear();

  // 2. Generate new map
  this.mapManager.generateMap();

  // 3. Recreate players for all connected sockets
  this.socketManager.recreatePlayersForConnectedSockets();

  // 4. Broadcast GAME_STARTED (clients reset their state)
  this.socketManager.broadcastEvent(new GameStartedEvent());

  // 5. Send YOUR_ID + full state to all sockets
  //    MUST be after GAME_STARTED so clients receive it after resetting
  this.socketManager.sendInitializationToAllSockets();
}
```

### `sendInitializationToAllSockets()` in server-socket-manager.ts
```typescript
public sendInitializationToAllSockets(): void {
  for (const socket of connectedSockets) {
    const player = this.players.get(socket.id);
    if (player) {
      // Send YOUR_ID first
      socket.emit(YOUR_ID, player.getId());

      // Then send full state
      sendFullState(context, socket);
    }
  }
}
```

## Client Implementation

### `resetAndRequestInitialization()` in client-event-listener.ts
```typescript
private resetAndRequestInitialization(reason: string): void {
  // Reset both flags
  this.hasReceivedPlayerId = false;
  this.hasReceivedInitialState = false;

  // Clear interpolation state
  this.interpolation.reset();

  // Request fresh data (may be redundant if server sends proactively)
  this.socketManager.requestPlayerId();
  this.requestFullState(reason);
}
```

### Event Handlers

**GAME_STARTED handler:**
```typescript
// Reset state and wait for new initialization
context.resetAndRequestInitialization("GameStarted event");
```

**YOUR_ID handler:**
```typescript
context.gameState.playerId = event.getPlayerId();
context.setHasReceivedPlayerId(true);
context.checkInitialization();
```

**GAME_STATE_UPDATE handler:**
```typescript
// Drop delta updates before initialization
if (!isFullState && (!hasReceivedPlayerId || !hasReceivedInitialState)) {
  return; // Drop
}

// Drop full state before player ID
if (isFullState && !hasReceivedPlayerId) {
  return; // Drop
}

// Process the update...
if (isFullState) {
  context.setHasReceivedInitialState(true);
  context.checkInitialization();
}
```

## Full State Contents

The full game state event includes:

| Field | Type | Description |
|-------|------|-------------|
| `entities` | Entity[] | All game entities (players, enemies, items, etc.) |
| `isFullState` | boolean | Always `true` for full state |
| `timestamp` | number | Server timestamp |
| `waveNumber` | number | Current wave number |
| `waveState` | WaveState | PREPARATION or ACTIVE |
| `phaseStartTime` | number | When current phase started |
| `phaseDuration` | number | Duration of current phase |
| `mapData` | MapData | Ground tiles, collidables, biome positions |

## Binary Serialization

All events use binary serialization for efficiency:

- Entity data uses buffer serialization with extension system
- Game state metadata uses bitset flags to indicate which fields are present
- Map data is JSON-stringified and included in the buffer

When `onlyDirty=false`, all entity fields and all extensions serialize ALL their data (full serialization). When `onlyDirty=true`, only dirty fields and dirty extensions are serialized.
