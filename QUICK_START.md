# Survive the Night - Quick Architecture Reference

## What is This Game?

A **multiplayer online survival game** where players explore randomly generated worlds, gather resources, craft items, and survive zombie waves at night. Uses server-authoritative client-server architecture with real-time multiplayer via Socket.io.

## Key Stats

- **Architecture**: Client-Server (Server-Authoritative)
- **Tech Stack**: Node.js/TypeScript (server), Canvas 2D (client), React Router 7 (website)
- **Tick Rate**: 30 ticks/second (server), 60 FPS (client)
- **Game Loop**: Day/Night cycle with zombie spawning
- **Networking**: Socket.io WebSockets with event-driven architecture
- **Monorepo**: 4 packages (game-server, game-client, game-shared, website)

## Package Overview

| Package | Purpose | Tech |
|---------|---------|------|
| **game-server** | Authoritative game logic, physics, AI | Node.js, Express, Socket.io |
| **game-client** | Rendering & input, client prediction | Canvas 2D, Socket.io-client |
| **game-shared** | Types, constants, utilities | TypeScript only |
| **website** | Lobby, game launcher, editor | React Router 7, TailwindCSS |

## Core Architecture Patterns

### 1. Entity-Component System (ECS)
- **Entity**: Container with unique ID and type
- **Extensions**: Components that add behavior (Positionable, Movable, Destructible, etc.)
- **No deep inheritance**: Composition over inheritance

```typescript
Entity {
  id: string
  type: EntityType
  extensions: Extension[]
  gameManagers: IGameManagers
}
```

### 2. Networking: Event-Driven
- **Server sends**: 30+ event types (GameStateEvent, PlayerDeathEvent, etc.)
- **Client sends**: Input, crafting requests, chat
- **Socket.io**: WebSocket transport with HTTP fallback
- **Serialization**: Entities serialize extensions for network transmission

### 3. Game Loop

**Server (30 ticks/second)**:
1. Update entities & physics
2. Process AI & combat
3. Handle day/night cycle
4. Broadcast game state
5. Track changes & cleanup

**Client (60 FPS)**:
1. Gather input
2. Predict local player movement
3. Reconcile with server position
4. Update camera & UI
5. Render everything

### 4. Server Authority with Client Prediction
- Server is authoritative for all game state
- Client predicts movement locally for responsiveness
- Server state arrives ~30ms later, client smoothly corrects
- Prevents cheating, enables fair multiplayer

## Key Systems

### Combat System
- Players: Health, weapons, stamina
- Weapons: Pistol, Shotgun, AK47, GrenadeLauncher, Knife
- Zombies: 7 types with different AI (melee, flying, spitter, exploding, leaping)
- Damage: Weapon damage + cooldown system

### Crafting & Inventory
- 10 inventory slots with item stacking
- 4 recipes: Bandage, Spike, Torch, Wall
- Server-authoritative recipe validation
- Merchant NPC with rotating inventory

### Map System
- Randomly generated 64x64 tile maps (1024x1024 pixels)
- 10+ biome types (Forest, City, Water, Farm, etc.)
- Tile-based collision layers
- A* pathfinding for zombie AI

### Day/Night Cycle
- Day: 180 seconds (kill zombies, rebuild, explore)
- Night: 120 seconds (survive zombie waves)
- Spawning scales with day number
- Players revived at day start

## File Organization

```
game-server/src/
├── entities/       # Player, Zombies, Items, Weapons
├── extensions/     # ECS components (Positionable, Movable, etc.)
├── managers/       # EntityManager, MapManager, NetworkManager
├── biomes/         # Map generation data
├── network/        # Packet & protocol definitions
└── server.ts       # Game loop entry point

game-client/src/
├── entities/       # Client-side entity definitions
├── extensions/     # Client-side ECS components
├── managers/       # Input, Camera, Prediction, Rendering
├── ui/            # UI panels (HUD, Inventory, Crafting)
├── particles/     # Visual effects
├── renderer.ts    # Canvas 2D rendering
├── state.ts       # Client game state type
└── client.ts      # Client entry point

game-shared/src/
├── entities/      # Shared configs & registries
├── events/        # Event type definitions
├── types/         # Type definitions
├── config/        # Game constants & balancing
├── recipes/       # Crafting recipe definitions
└── util/          # Math, Physics, Pathfinding
```

## Development Tips

### Adding a New Entity
1. Create in game-server/entities/
2. Add to EntityManager.entityMap
3. Create client version in game-client/entities/
4. Add to EntityFactory
5. Register for spawning in MapManager

### Adding an Extension
1. Create in game-server/extensions/
2. Implement `serialize()` and `deserialize()`
3. Add to extensionsMap in game-server/extensions/index.ts
4. Add type to ExtensionNames enum
5. Create client version if needed

### Accessing Extensions
```typescript
// Check if has extension
if (entity.hasExt(Positionable)) {
  // Get extension
  const pos = entity.getExt(Positionable).getPosition();
}
```

## Performance Targets
- Server: 4-5ms per update (within ~33ms tick budget)
- Client: 60 FPS (16ms per frame)
- Network: Optimized state sending via EntityStateTracker
- Collision: Tile-based + entity AABB checks

## Testing & Debugging

### Admin Commands (dev mode)
```javascript
commandManager.setAdminPassword('admin');
commandManager.createItem('pistol');
```

### Network Simulation
Configure latency in client-prediction.ts for testing latency effects

### Performance Monitoring
Built-in performance tracking logs stats every 10 seconds

## Deployment
- Docker containerization
- Caddy reverse proxy (HTTPS)
- Environment variables: ADMIN_PASSWORD, VITE_WSS_URL

## Key Dependencies
- **Socket.io**: Real-time communication
- **Obscenity**: Bad word filtering
- **Vector2**: Math utilities
- **Hitbox**: Collision detection
- **React Router 7**: Website framework
- **Tailwind CSS**: Styling

## Extension Types Reference

| Extension | Purpose |
|-----------|---------|
| Positionable | Position & size |
| Movable | Velocity & movement |
| Collidable | Hitbox & collision |
| Destructible | Health & damage |
| Inventory | Item storage |
| Carryable | Can be picked up |
| Consumable | Can be used |
| Interactive | Interact actions |
| Updatable | Custom update logic |
| Illuminated | Light emission |
| Groupable | Item stacking |
| Trigger | Collision triggers |
| Combustible | Fire mechanics |

## Event Categories

**Server → Client Events** (30+ types):
- GameStateEvent (full state)
- PlayerHurtEvent, PlayerDeathEvent
- ZombieAttackedEvent, ZombieDeathEvent
- GameStartedEvent, GameOverEvent
- ChatMessageEvent, ExplosionEvent

**Client → Server Events**:
- PlayerInputEvent (keyboard/mouse)
- CraftRequestEvent
- ChatMessageEvent
- MerchantBuyEvent
- PingEvent (latency measurement)

## Game Constants
- Player health: 100 HP
- Inventory slots: 10
- Interact radius: 20 pixels
- Day duration: 180 seconds
- Night duration: 120 seconds
- Tile size: 16x16 pixels
- Map size: 64x64 tiles

This architecture supports scaling to multiple players in a single instance and provides a foundation for adding new entities, systems, and features without major refactoring.
