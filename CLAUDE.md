# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Survive the Night** is a multiplayer online survival game where players explore randomly generated worlds, gather resources, craft items, and defend against zombie waves during nighttime cycles. The project uses a monorepo structure with npm workspaces.

## Development Commands

### Running the Application
```bash
# Start all services in parallel (client + server)
npm run dev

# Start individual services
npm run dev:website    # React Router 7 website (localhost:5173)
npm run dev:server     # Game server (localhost:3000)
```

### Building
```bash
npm run build:server   # Build game server
npm run build:website  # Build website
```

### Testing
```bash
npm run test:game-client  # Run game-client tests
npm run test:game-server  # Run game-server tests
```

## Workspace Structure

This is a monorepo with 4 packages:

- **`packages/game-server`**: Node.js/Express server with Socket.io for multiplayer. Server-authoritative game logic running at 30 ticks/second.
- **`packages/game-client`**: Canvas 2D rendering client with client-side prediction running at 60 FPS. Handles input, rendering, and interpolation.
- **`packages/game-shared`**: Shared TypeScript types, utilities, and constants used by both client and server.
- **`packages/website`**: React Router 7 application for game lobby, authentication, and launcher.

## Core Architecture

### Entity-Component System (ECS)

The game uses a composition-based Entity-Component System with **Extensions**:

- **Entities** are containers for game objects (players, zombies, items, projectiles)
- **Extensions** are reusable behavioral components attached to entities
- Server entities and client entities are separate but synchronized via networking

#### Working with Extensions

```typescript
// Check if entity has an extension
if (entity.hasExt(ClientPositionable)) {
  const position = entity.getExt(ClientPositionable).getPosition();
}

// Get extension directly (assumes it exists)
const position = entity.getExt(ClientPositionable).getPosition();
```

#### Common Extension Types

**Server Extensions** (`packages/game-server/src/entity/extensions/`):
- `Positionable` - Position and movement
- `Damageable` - Health and damage
- `Collidable` - Collision detection
- `Inventoriable` - Inventory management
- `Attackable` - Combat and weapons
- `Gatherable` - Resource collection
- `Craftable` - Crafting recipes
- `Buildable` - Structure placement
- `ZombieAI` - Enemy AI behavior

**Client Extensions** (`packages/game-client/src/entity/extensions/`):
- `ClientPositionable` - Client-side position tracking
- `Renderable` - Visual rendering
- `Animatable` - Animation state
- `InterpolatedPositionable` - Smooth position interpolation
- `PlayerControllable` - Input handling

### Networking

The game uses Socket.io with 30+ event types for client-server communication. The server is authoritative - clients send inputs, server validates and broadcasts state updates.

**Event naming convention**: Events are defined in `packages/game-shared/src/types.ts` using the `ClientToServerEvents` and `ServerToClientEvents` interfaces.

### Adding New Entity Types

When adding a new entity (especially zombies):

1. Create server entity class in `packages/game-server/src/entity/entities/`
2. Create client entity class in `packages/game-client/src/entity/entities/`
3. Update `EntityFactory` on the client to handle spawning
4. Add entity to `EntityManager`'s `entityMap`
5. Update `MapManager` spawn logic if needed for procedural generation

Example entity types: `PlayerEntity`, `ZombieEntity`, `FastZombieEntity`, `TankZombieEntity`, `ProjectileEntity`, `ItemEntity`

### Game Systems

**Key Manager Classes** (Facade Pattern):

Server-side (`packages/game-server/src/managers/`):
- `GameManagers` - Central facade providing access to all managers
- `EntityManager` - Entity lifecycle and queries
- `MapManager` - Procedural map generation (10+ biomes)
- `CollisionManager` - Physics and collision detection
- `CombatManager` - Damage calculation and combat
- `DayNightManager` - Day/night cycle and zombie spawning
- `CraftingManager` - Item crafting system
- `EventManager` - Game event broadcasting

Client-side (`packages/game-client/src/managers/`):
- `GameClient` - Main client facade
- `RenderManager` - Canvas 2D rendering pipeline
- `InputManager` - Keyboard/mouse input handling
- `CameraManager` - Viewport and camera controls
- `UIManager` - HUD and UI rendering

### Map System

- Chunk-based world generation (512x512 pixel chunks)
- 10+ biomes: Forest, Desert, Snow, Swamp, etc.
- Procedurally placed resources (trees, rocks, bushes)
- Buildings and structures spawn in specific biomes
- Collision tiles for pathfinding and physics

### Combat System

- 6 weapon types: Fist, Pistol, Shotgun, Rifle, Minigun, Grenade Launcher
- 7+ zombie variants with different stats (speed, health, damage)
- Server validates all damage calculations
- Projectile-based ranged weapons
- Melee attacks use proximity detection

### Important Conventions

- **TypeScript**: 100% type-safe codebase - always use proper types
- **Entity IDs**: Entities use numeric IDs for network efficiency
- **Coordinate system**: Uses pixel coordinates (not tile-based)
- **Tick rate**: Server runs at 30 ticks/second, client renders at 60 FPS
- **Client prediction**: Client predicts movement, server corrects if needed
- **State serialization**: Entities serialize/deserialize for network transmission

### React Router 7 (Website Package)

The website package uses React Router 7 (not Remix or older React Router versions). Refer to [React Router docs](https://reactrouter.com/) for routing, data loading, and actions.

## Technology Stack

- **TypeScript** - All packages
- **Node.js + Express** - Game server
- **Socket.io** - Real-time multiplayer
- **Canvas 2D API** - Game rendering
- **React 19** - Website UI
- **React Router 7** - Website routing and SSR
- **Vitest** - Testing framework
- **tsx/tsup** - TypeScript tooling
- **TailwindCSS** - Website styling
- **obscenity** - Bad word filtering for usernames

## Key Files to Know

- `packages/game-shared/src/types.ts` - Shared type definitions and Socket.io events
- `packages/game-shared/src/constants.ts` - Game balance constants
- `packages/game-server/src/server.ts` - Server entry point
- `packages/game-server/src/game.ts` - Main game loop
- `packages/game-client/src/client.ts` - Client entry point
- `packages/game-client/src/game-client.ts` - Main client game logic
- `.cursorrules` - Additional code patterns and examples
