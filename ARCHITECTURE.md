# Survive the Night Game - Codebase Architecture Analysis

## Overview

**Survive the Night** is a **multiplayer online cooperative survival game** where players explore randomly generated worlds to gather resources, craft items, and defend their base against waves of zombies during nighttime. The game uses a **client-server architecture** with real-time multiplayer synchronization via WebSockets (Socket.io).

**Two Sentence Pitch:** An online multiplayer experience where you explore randomly generated worlds in search of supplies used to craft items for you and your base to help you survive the nights from waves of zombies.

---

## 1. Overall Architecture

### Game Type

- **Multiplayer Online Game** with survival and crafting mechanics
- **Client-Server Model** with server-authoritative gameplay
- **Day/Night Cycle System**: Players survive zombie waves at night, rebuild and explore during day
- **Real-time Multiplayer**: Up to multiple players in the same world instance

### Client-Server Architecture

#### Server (game-server)

- **Technology**: Node.js with Express.js + Socket.io
- **Responsibilities**:
  - Authoritative game state management and updates
  - Entity lifecycle (creation, destruction, updates)
  - Physics and collision calculations
  - Game loop running at fixed tick rate (30 ticks per second default)
  - Event broadcasting to all connected clients
  - Day/night cycle management
  - Zombie spawning and AI
  - Player command processing
  - Map generation and biome management

#### Client (game-client)

- **Technology**: Canvas-based 2D rendering, Socket.io-client
- **Responsibilities**:
  - Rendering game world and entities
  - User input handling
  - Client-side prediction for responsive gameplay
  - Sound and particle effects
  - UI rendering (HUD, inventory, crafting, chat)
  - Local entity interpolation for smooth animation
  - Server synchronization via event listeners

#### Website (website)

- **Technology**: React Router 7, TypeScript, Tailwind CSS
- **Responsibilities**:
  - Game lobby and matchmaking UI
  - Biome editor (development only)
  - Game launcher
  - Server connectivity management

#### Shared Code (game-shared)

- **Technology**: TypeScript
- **Responsibilities**:
  - Type definitions and interfaces
  - Game constants and configuration
  - Entity definitions and registries
  - Event type definitions
  - Utility functions (physics, math, pathfinding)
  - Recipe definitions
  - Shared enums and constants

---

## 2. Monorepo Package Structure

### Workspace Configuration

```
survive-the-night/
├── packages/
│   ├── game-server/     # Server application (Express + Socket.io)
│   ├── game-client/     # Canvas-based game client
│   ├── game-shared/     # Shared types, constants, utilities
│   └── website/         # React Router web interface
└── package.json         # Monorepo root with npm workspaces
```

### Package Dependencies

**game-server** depends on:

- `@survive-the-night/game-shared` (types, constants)
- express, socket.io, dotenv, obscenity (bad word filtering)

**game-client** depends on:

- `@survive-the-night/game-server` (for types in development)
- `@survive-the-night/game-shared` (types, constants)
- socket.io-client

**website** depends on:

- `@survive-the-night/game-shared` (types, constants)
- react, react-router 7, @tanstack/react-query, zustand (state), tailwindcss

**game-shared** is a pure TypeScript library with no external dependencies

---

## 3. Core Game Systems

### 3.1 Entity/Component System Architecture

The game uses an **ECS (Entity-Component System)** pattern implemented via:

#### Base Entity Class

```typescript
// All entities inherit from Entity base class
Entity {
  id: string                    // Unique identifier
  type: EntityType              // Enum specifying entity category
  extensions: Extension[]       // Components attached to entity
  gameManagers: IGameManagers   // Ref to global managers
}
```

#### Extension System (Components)

Instead of traditional "components", this system uses **Extensions** - objects that add behavior to entities:

Key Extension Types:

- **Positionable**: Position (x, y) and size information
- **Movable**: Velocity and movement vectors
- **Collidable**: Collision hitbox and detection
- **Destructible**: Health and damage system
- **Inventory**: Item storage for players
- **Carryable**: Items that can be carried
- **Consumable**: Food/health items that can be used
- **Interactive**: Entities with interact actions
- **Updatable**: Entities with update() logic
- **Illuminated**: Light emission
- **Groupable**: Item stacking
- **Trigger**: Collision-based triggers
- **OneTimeTrigger**: Trigger that fires once
- **TriggerCooldownAttacker**: Combat cooldown system
- **Combustible**: Fire damage mechanics
- **Ignitable**: Can be set on fire

#### Entity Categories

- Player
- Enemies (Zombie, BigZombie, FastZombie, BatZombie, SpitterZombie, ExplodingZombie, LeapingZombie)
- Items (Bandage, Cloth, Coin, Torch, Spikes, Landmine, Grenade, etc.)
- Weapons (Pistol, Shotgun, BoltActionRifle, AK47, GrenadeLauncher, Knife)
- Projectiles (Bullet, GrenadeProjectile)
- Environment (Tree, Wall, Fire, Merchant)
- Boundaries

#### Entity Serialization

Entities serialize directly into binary buffers for network transmission:

```typescript
const writer = new BufferWriter();
entity.serializeToBuffer(writer, false); // full state
```

### 3.2 Networking & Multiplayer Implementation

#### Real-time Communication: Socket.io

- **Transport**: WebSockets with HTTP fallback
- **Latency Simulation**: Optional configurable latency for testing
- **Delayed Socket Wrapper**: Both client and server can simulate network delay

#### Event System

Two types of events:

**Server-Sent Events** (30+ event types):

- GameStateEvent: Full entity state, day/night info
- PlayerHurtEvent, PlayerDeathEvent
- ZombieAttackedEvent, ZombieDeathEvent
- GameOverEvent, GameStartedEvent
- PlayerJoinedEvent, PlayerLeftEvent
- ChatMessageEvent
- ExplosionEvent
- And many more...

**Client-Sent Events**:

- PlayerInputEvent: Keyboard/mouse input
- CraftRequestEvent: Crafting requests
- ChatMessageEvent: Chat input
- PingEvent: Latency measurement
- AdminCommandEvent: Admin commands (if authorized)
- MerchantBuyEvent: Shop purchases

#### Event Flow Architecture

```
Client Input -> InputManager
  -> sends PlayerInput event
     -> ServerSocketManager receives
        -> processes in CommandManager
           -> updates entity state
              -> next game tick: serialize entities
                 -> broadcast GameStateEvent
                    -> ClientEventListener receives
                       -> updates GameState
                          -> next frame render
```

#### Player Joining Flow

1. Client connects with display name
2. Server creates Player entity
3. Server broadcasts PlayerJoinedEvent
4. Server sends MapEvent (map data)
5. Server sends YourIdEvent (player's entity ID)
6. Server broadcasts current GameState

#### Data Synchronization Strategy

- **Server Authority**: Server is authoritative for all game state
- **Optimistic Updates**: Client predicts position locally
- **Reconciliation**: Client compares predicted vs server position, smoothly corrects
- **Batching**: Game state updates sent every server tick, not per action
- **Selective Broadcasting**: Only changed properties in state updates

### 3.3 Game Loop & State Management

#### Server-Side Game Loop

```
Fixed Tick Rate: 30 ticks per second (1000/30 = ~33ms per tick)

Main Loop:
1. Update phase:
   - EntityManager.update(deltaTime)
   - Update each entity's extensions (Movable, Updatable, etc.)
2. Physics/Collision:
   - Built into entity updates (Movable + Collidable interaction)
3. Logic:
   - Cooldown processing
   - AI behavior (zombie pathfinding, attacking)
4. Wave System:
   - Track wave phases (PREPARATION, ACTIVE, COMPLETED)
   - Spawn zombies when wave starts
   - Manage wave progression
5. Broadcast:
   - Serialize all dynamic entities
   - Send GameStateEvent to all clients
6. State Tracking:
   - Track entity state changes for efficient updates
7. Cleanup:
   - Remove marked entities
   - Performance monitoring
```

#### Server State

```typescript
GameServer {
  waveNumber: number         // Current wave number
  waveState: WaveState       // Current wave phase (PREPARATION, ACTIVE, COMPLETED)
  phaseStartTime: number     // When current phase started
  phaseDuration: number      // Duration of current phase
  isGameReady: boolean       // Game started
  isGameOver: boolean        // All players dead
}
```

#### Client-Side Game State

```typescript
GameState {
  startedAt: number          // When game started on client
  playerId: string           // This client's player ID
  entities: ClientEntityBase[] // All visible entities
  waveNumber: number         // Current wave number
  waveState: WaveState       // Current wave phase
  phaseStartTime: number     // When current phase started
  phaseDuration: number      // Duration of current phase
  crafting: boolean          // UI state: crafting menu open
}
```

#### Client Update Loop

```
60 FPS Animation Loop:
1. Input:
   - Gather keyboard/mouse input via InputManager
   - Only send to server if input changed
2. Prediction:
   - PredictionManager predicts local player movement
   - Checks collision locally
3. Reconciliation:
   - Smoothly lerp towards server's authoritative position
4. Camera:
   - Position camera on player
5. UI Update:
   - HUD, inventory, timer updates
6. Render:
   - Renderer draws all entities, particles, UI
```

### 3.4 Physics & Collision Systems

#### Collision Types

- **Tile-based Collision**: Map has collidable layers (indexed by tile)
- **Entity-Entity Collision**: Hitbox-based AABB (axis-aligned bounding box)
- **Pixel-Perfect**: Most interactions use pixel-level hitboxes

#### Physics Utilities

```typescript
// Path finding
pathTowards(from: Vector2, to: Vector2,
           groundLayer: number[][],
           collidablesLayer?: number[][]): Vector2

// Velocity calculation
velocityTowards(from: Vector2, to: Vector2): Vector2

// Distance calculation
distance(a: Vector2, b: Vector2): number

// Collision detection
isColliding(hitbox1: Hitbox, hitbox2: Hitbox): boolean

// Vector normalization
normalizeVector(v: Vector2): Vector2
```

#### Movement Pipeline

1. Entity has Movable extension (velocity, acceleration)
2. Movable.update() applies velocity to Positionable position
3. Collidable.update() checks collisions
4. If collision, movement is blocked/adjusted
5. Position synchronized via network

#### Map Collision Layers

Each map has:

- **groundLayer**: Walkable terrain (tile IDs)
- **collidablesLayer**: Blocking terrain (-1 = blocked, else passable)
- Used for pathfinding (A\* algorithm) and collision checking

### 3.5 Map/Level System

#### Map Generation

- **Random Generation**: Different biome per game instance
- **Biome System**: 10+ different biome types with unique spawns
- **Tile-based**: 64x64 tile maps (each tile is 16x16 pixels = 1024x1024 world)

#### Biome Types

```
campsite    - Player starting area
forest1, forest2, forest3, forest4 - Tree-heavy areas
water       - Swimming areas
farm        - Open fields
gas-station - Industrial area
city        - Urban zombie hotspots
merchant    - NPC trader location
```

#### Biome Data Structure

Each biome defines:

- Ground layer tiles
- Collidable layer
- Spawn points for items/enemies
- Decoration and visual elements
- Merchant location and inventory

#### Map Manager Responsibilities

- Map generation on game start
- Biome assembly and rendering data
- Zombie spawning (scaled by day number)
- Environmental entity placement (trees, walls, fires)
- Merchant inventory randomization

### 3.6 Player & Combat Systems

#### Player Entity

Extensions:

- Positionable, Movable, Collidable
- Inventory (10 slots)
- Destructible (health system)
- Interactive (can interact with items/NPCs)
- Illuminated (light when holding torch)
- Carryable (can carry items)

Player-Specific:

- Health: 0-100 HP
- Stamina: Sprint mechanic with cooldown
- Weapon/Item slots: 10 inventory slots + hotbar
- Crafting UI: Recipes for items
- Interaction: Pick up items, talk to merchants, use consumables

#### Zombie Entities

Types:

- **Zombie**: Basic melee zombie, chases player
- **BigZombie**: Larger, more health, stronger attack
- **FastZombie**: Faster movement
- **BatZombie**: Aerial zombie
- **SpitterZombie**: Ranged attack (spits acid)
- **ExplodingZombie**: Explodes on death
- **LeapingZombie**: Jumping attack pattern

Zombie AI:

```
Movement Strategies:
- MeleeMovementStrategy: Pathfind to player using A*
- Recalculate waypoints every 1 second
- Move along calculated path

Attack Patterns:
- Cooldown system between attacks
- Check distance to player
- Trigger attack when in range
- Different attacks per zombie type
```

Zombie Spawning:

- Night spawn at biome-specific locations
- Quantity scales with day number
- Day start: all zombies killed, players revived

#### Combat System

- **Range Combat**: Guns (Pistol, Shotgun, Rifles) with ammunition
- **Melee Combat**: Knife with attack range
- **Cooldown System**: Attack cooldowns prevent spam
- **Damage Model**: Each weapon has damage amount
- **Health/Death**: Destructible extension tracks health

Weapon Types:

- Pistol: Fast, low damage
- Shotgun: Medium range, medium damage
- Bolt Action Rifle: High damage, slow
- AK47: Auto, medium damage
- Grenade Launcher: Area damage, slow fire rate
- Knife: Melee, fast attacks

### 3.7 Crafting & Inventory System

#### Recipe System

Recipes defined in game-shared/recipes:

- **Wall Recipe**: Wood + Cloth = Wall (building/fortification)
- **Spike Recipe**: Wood + Metal = Spikes (trap)
- **Torch Recipe**: Wood + Gasoline = Torch (light)
- **Bandage Recipe**: Cloth + Bandage = Healing item

Recipe Validation:

- Check player has required items
- Execute on server only
- Remove ingredients, add product
- Broadcast inventory change

#### Inventory System

- 10 slots for items
- Items can stack (Groupable extension)
- Equipment slots (current weapon)
- Drop items to ground
- Pick up items from ground
- Consume items (bandage = heal)

#### NPC Merchant System

- Static merchant in map
- Shop with rotating inventory
- Buy items with coins
- Interaction radius: 20 pixels

---

## 4. Key Technologies

### Game Server (packages/game-server)

- **Node.js + Express.js**: HTTP server + REST API
- **Socket.io**: Real-time WebSocket communication
- **TypeScript**: Type-safe development
- **TSup**: Build tooling
- **Vitest**: Unit testing
- **Obscenity**: Bad word filtering for chat
- **Custom Extensions**: A\*, pathfinding, physics

### Game Client (packages/game-client)

- **Canvas 2D API**: Rendering engine (no game framework like Phaser)
- **Socket.io-client**: Server communication
- **TypeScript**: Type safety
- **Vitest**: Testing
- **Custom Managers**: Input, Camera, Rendering, Particles, Prediction

### Website (packages/website)

- **React 19**: UI framework
- **React Router 7**: Routing and server rendering
- **Tailwind CSS**: Styling
- **React Hook Form**: Form handling
- **Zod**: Schema validation
- **TanStack React Query**: Server state management
- **Zustand**: Client state management
- **Lucide React**: Icon library

### Shared Libraries

- **Vector2 utility class**: Math operations
- **Hitbox system**: Collision detection
- **TypeScript**: All type definitions

### Deployment & DevOps

- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Caddy**: Reverse proxy + HTTPS
- **npm workspaces**: Monorepo management

---

## 5. Code Organization Patterns

### Game Server Structure

```
packages/game-server/src/
├── entities/           # Entity definitions
│   ├── player.ts       # Player entity
│   ├── enemies/        # Zombie variants
│   ├── weapons/        # Weapon entities
│   ├── items/          # Droppable items
│   ├── projectiles/    # Bullets, grenades
│   ├── environment/    # Trees, walls, fire
│   └── entity.ts       # Base class
├── extensions/         # ECS components
│   ├── positionable.ts
│   ├── movable.ts
│   ├── collidable.ts
│   ├── destructible.ts
│   ├── inventory.ts
│   └── index.ts        # Export registry
├── managers/           # Core game systems
│   ├── entity-manager.ts        # Entity lifecycle
│   ├── entity-state-tracker.ts  # Efficient syncing
│   ├── map-manager.ts           # Map generation
│   ├── server-socket-manager.ts # Network I/O
│   ├── command-manager.ts       # Input processing
│   └── game-managers.ts         # Manager container
├── network/
│   ├── packet.ts       # Network packet format
│   └── index.ts
├── biomes/             # Map generation data
│   ├── campsite.ts
│   ├── forest1.ts
│   └── ...
├── config/
│   ├── config.ts       # Game configuration
│   └── simulation.ts   # Network simulation
├── util/               # Utility functions
│   ├── physics.ts
│   ├── delayed-socket.ts
│   └── performance.ts
├── commands/           # Admin commands
└── server.ts           # Server entry point
```

### Game Client Structure

```
packages/game-client/src/
├── entities/           # Client-side entity definitions
│   ├── player.ts       # Player with rendering
│   ├── enemies/        # Zombie rendering
│   ├── items/          # Item rendering
│   └── entity-factory.ts  # Factory for creating entities
├── extensions/         # Client-side extensions
│   ├── client-entity.ts   # Base client entity
│   ├── positionable.ts    # Client version
│   ├── movable.ts         # Client version
│   └── ...
├── managers/           # System managers
│   ├── input.ts             # Keyboard/mouse handling
│   ├── camera.ts            # View management
│   ├── prediction.ts        # Client-side prediction
│   ├── interpolation.ts     # Entity smoothing
│   ├── client-socket-manager.ts # Network
│   ├── asset.ts             # Asset loading
│   ├── sound-manager.ts     # Audio
│   └── particles.ts         # Particle effects
├── ui/                 # UI panels
│   ├── hud.ts          # Main HUD
│   ├── inventory-bar.ts
│   ├── crafting-table.ts
│   ├── merchant-buy-panel.ts
│   └── game-over-dialog.ts
├── particles/          # Particle effects
│   ├── swipe.ts        # Attack effect
│   └── explosion.ts    # Explosion
├── config/
│   └── client-prediction.ts
├── renderer.ts         # Canvas rendering
├── client-event-listener.ts # Network event handling
├── state.ts            # Game state type
└── client.ts           # Client entry point
```

### Game Shared Structure

```
packages/game-shared/src/
├── entities/           # Entity definitions & configs
│   ├── zombie-configs.ts
│   ├── item-configs.ts
│   ├── weapon-registry.ts
│   └── ...
├── events/             # Event definitions
│   ├── server-sent/    # Server to client events
│   ├── client-sent/    # Client to server events
│   ├── types.ts        # Base interfaces
│   └── events.ts       # Event enum constants
├── types/              # Type definitions
│   ├── entity.ts       # Entity types
│   ├── weapons.ts      # Weapon types
│   └── ...
├── config/
│   └── prediction.ts   # Config related to Prediction logic
│   └── ...
├── constants/          # Game constants
│   ├── constants.ts    # Re-export from game-config
│   └── ...
├── recipes/            # Crafting recipes
│   ├── bandage-recipe.ts
│   └── ...
├── map/                # Map data types
├── util/               # Shared utilities
│   ├── physics.ts      # Pathfinding, distance
│   ├── vector2.ts      # Vector math
│   ├── hitbox.ts       # Collision detection
│   ├── input.ts        # Input type definition
│   ├── inventory.ts    # Item types
│   ├── direction.ts    # Direction enum
│   └── extension-types.ts # Extension names
└── commands/           # Admin commands
```

### Design Patterns Used

#### 1. Entity-Component System (ECS)

- Entities are containers for behavior
- Extensions add specific functionalities
- Avoids deep inheritance hierarchies
- Example: Player = Entity + Positionable + Movable + Inventory + Destructible

#### 2. Manager Pattern

- GameManagers holds references to all subsystems
- Entities receive gameManagers in constructor
- Allows cross-system communication
- Example: Entity can broadcast event via `gameManagers.getBroadcaster()`

#### 3. Factory Pattern

- EntityFactory creates entities with correct setup
- ClientEntityFactory creates client-specific entities
- Centralizes entity creation logic

#### 4. Event-Driven Architecture

- Socket.io events for network communication
- Event listeners handle incoming messages
- Broadcasting for server-to-client updates
- Decouples systems (entity changes don't need direct knowledge of renderer)

#### 5. State Tracking

- EntityStateTracker monitors which entities changed
- Only serialize changed entities to network
- Reduces bandwidth and latency

#### 6. Observer Pattern

- ClientEventListener registers for all events
- Updates local GameState when events received
- Renderer observes GameState changes

#### 7. Extension/Plugin Pattern

- Extensions added to entities dynamically
- Allows composition over inheritance
- Easy to add new behavior without modifying base Entity class

---

## 6. Important Conventions & Patterns

### From .cursorrules File

#### Entity Creation Convention

When adding a new zombie entity:

1. Create entity class in game-server/entities
2. Add to EntityManager's entityMap
3. Create server entity
4. Create client entity
5. Update EntityFactory on client
6. Update MapManager to spawn new type

#### Extension Usage

```typescript
// Getting extension position
const position = entity.getExt(ClientPositionable).getPosition();

// Checking if entity has extension
if (entity.hasExt(ClientPositionable)) {
  const position = entity.getExt(ClientPositionable).getPosition();
}
```

#### Server-Client Synchronization

- Server updates are authoritative
- Client predicts locally for responsiveness
- Extensions serialize/deserialize for network transmission
- Reconciliation smoothly corrects prediction errors

### Naming Conventions

- **Server entities**: Standard name (Player, Zombie)
- **Client entities**: Prefixed with "Client" (PlayerClient, ZombieClient)
- **Extensions**: Each has `static readonly type` identifier
- **Events**: Suffixed with "Event" (PlayerDeathEvent, GameStartedEvent)

### Extension Pattern

Every extension implements:

```typescript
export default class MyExtension implements Extension {
  public static readonly type = ExtensionTypes.MY_EXTENSION;

  private self: IEntity;

  public constructor(self: IEntity) {
    this.self = self;
  }

  public update(deltaTime?: number) {
    // Called each server tick
  }

  public serialize(): ExtensionSerialized {
    // Send to clients
    return { type: MyExtension.type, ...data };
  }

  public deserialize?(data: ExtensionSerialized): this {
    // Receive from server
    return this;
  }
}
```

### Entity Extension Access Pattern

```typescript
// Server side (Entity has extensions)
entity.addExtension(new Positionable(entity));
entity.hasExt(Positionable); // true
entity.getExt(Positionable).setPosition(new Vector2(10, 10));

// Client side (ClientEntityBase has extensions too)
clientEntity.getExt(ClientPositionable).getPosition();
```

### Event Broadcasting

```typescript
// Server broadcasts to all clients
this.socketManager.broadcastEvent(new GameStateEvent(stateUpdate));

// Client sends to server
this.socketManager.emit(ClientSentEvents.PLAYER_INPUT, input);
```

### Performance Optimization Notes

- Performance tracking and logging built-in
- Updates averaged 4-5ms (within tick budget of ~33ms)
- Entity state tracker only sends changed entities
- Particle effects pooled (commented out performance tracking available)
- Sound falloff distance optimized
- Bad word filtering integrated for chat

### Admin Commands

Available when DEBUG_ADMIN_COMMANDS enabled:

- Set password: `commandManager.setAdminPassword('password')`
- Create item: `commandManager.createItem('pistol')`
- Other game-altering commands

---

## 7. Data Flow Diagrams

### Player Input to Server Processing

```
Client KeyDown Event
  ↓
InputManager captures input
  ↓
InputManager.hasChanged() = true
  ↓
GameClient.sendInput(Input)
  ↓
ClientSocketManager.emit(PLAYER_INPUT, input)
  ↓
[Network: Socket.io]
  ↓
ServerSocketManager.on(PLAYER_INPUT)
  ↓
CommandManager.processInput(playerId, input)
  ↓
Player entity updates:
  - Movable.setVelocity()
  - Weapon.orientTowards()
  - Fire weapon if input.fire = true
  ↓
EntityManager.update(deltaTime)
  ↓
GameServer.broadcastGameState()
  ↓
[Network: Socket.io]
  ↓
ClientEventListener.onGameStateUpdate()
  ↓
Create/Update/Remove entities in GameState
  ↓
Renderer renders updated entities
```

### Server Tick Cycle

```
Server Tick (every 33ms):
┌─────────────────────────────────────┐
│ 1. EntityManager.update(deltaTime)  │
│    - Each entity updates extensions │
│    - AI processing                  │
│    - Physics updates                │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 2. Wave System Management           │
│    - Track wave phases              │
│    - Spawn zombies on wave start   │
│    - Manage wave progression        │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 3. handleIfGameOver()               │
│    - Check all players dead         │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 4. broadcastGameState()             │
│    - Serialize entities             │
│    - Send GameStateEvent            │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 5. Track state changes              │
│    - EntityStateTracker             │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 6. Cleanup & Performance            │
│    - Remove marked entities         │
│    - Log performance metrics        │
└─────────────────────────────────────┘
```

### Client Frame Cycle

```
Client Frame (60 FPS, ~16ms):
┌──────────────────────────────────┐
│ 1. InputManager processes keys   │
│    - Gather keyboard input       │
└──────────────────────────────────┘
           ↓
┌──────────────────────────────────┐
│ 2. PredictionManager             │
│    - Predict local player move   │
│    - Check collision locally     │
└──────────────────────────────────┘
           ↓
┌──────────────────────────────────┐
│ 3. Reconciliation                │
│    - Lerp to server position     │
│    - Smooth correction            │
└──────────────────────────────────┘
           ↓
┌──────────────────────────────────┐
│ 4. If input changed:             │
│    - Send PlayerInput to server  │
└──────────────────────────────────┘
           ↓
┌──────────────────────────────────┐
│ 5. Camera positioning            │
│    - Follow player               │
└──────────────────────────────────┘
           ↓
┌──────────────────────────────────┐
│ 6. HUD update                    │
│    - Update timers, health, etc  │
└──────────────────────────────────┘
           ↓
┌──────────────────────────────────┐
│ 7. Renderer.render()             │
│    - Draw map                    │
│    - Draw entities               │
│    - Draw particles              │
│    - Draw UI                     │
└──────────────────────────────────┘
```

---

## 8. Key Design Decisions & Trade-offs

### Client Prediction vs Server Authority

- **Decision**: Optimistic client prediction with server reconciliation
- **Trade-off**: More responsive gameplay locally but need to handle position corrections
- **Implementation**: PredictionManager predicts, then smoothly lerps to server truth

### Canvas 2D vs Game Framework

- **Decision**: Custom Canvas 2D renderer instead of Phaser/Babylon
- **Trade-off**: More control and smaller bundle, but more custom code to maintain
- **Implementation**: Custom Renderer class with Transform/rendering pipeline

### Fixed Tick Rate Server

- **Decision**: 30 ticks/second server tick rate
- **Trade-off**: Predictable server updates but less real-time than variable
- **Implementation**: setInterval(update, 1000/30)

### Entity Serialization Strategy

- **Decision**: Serialize entire entity state each tick, not delta
- **Trade-off**: Simpler implementation, but EntityStateTracker mitigates bandwidth
- **Implementation**: GameStateEvent contains all dynamic entities

### Monorepo Structure

- **Decision**: Shared package for types, separate client/server/website
- **Trade-off**: Code duplication vs decoupling
- **Implementation**: npm workspaces with cross-package imports

---

## 9. Testing & Quality Assurance

- **Unit Testing**: Vitest used for both server and client
- **Performance Monitoring**: Built-in performance tracking
- **Network Simulation**: Optional latency simulation for testing
- **Admin Commands**: In-dev debugging capabilities
- **Bad Word Filtering**: Obscenity library for chat safety

---

## 10. Deployment Architecture

### Docker Containerization

```
survive-the-night/
├── Dockerfile (website)    - Node/React build
├── Dockerfile (game-server) - Node/TypeScript
└── docker-compose.yml      - Orchestration

Services:
- website:3000   - React Router app
- game-server:3001 - Game server
- caddy (reverse proxy) - HTTPS + routing
```

### Environment Configuration

- ADMIN_PASSWORD: Server-side admin protection
- VITE_WSS_URL: WebSocket server URL
- NODE_ENV: production/development modes

---

## Summary

Survive the Night is a well-architected multiplayer game with:

- Clean separation of concerns (client, server, shared)
- ECS pattern for flexible entity behavior
- Event-driven networking
- Server-authoritative gameplay with client prediction
- Optimized for performance and bandwidth
- Extensible system for adding new entities and behaviors
- Professional monorepo structure and tooling

The codebase demonstrates solid game dev practices including entity management, networking patterns, and real-time synchronization challenges.
