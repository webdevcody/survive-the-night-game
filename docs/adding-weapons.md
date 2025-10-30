# Adding Weapons to Survive the Night

This guide documents the complete process for adding a new weapon to the game. This process was documented while adding the Bolt Action Rifle.

## Overview

Adding a weapon requires changes across multiple files in both the shared, server, and client packages. The process involves:

1. Defining weapon types and configurations
2. Creating server-side entity classes
3. Creating client-side rendering classes
4. Registering entities in both server and client
5. Creating associated ammunition (if applicable)

## File Changes Required

### 1. Shared Configuration Files (game-shared package)

#### A. Add Weapon Type

**File:** `packages/game-shared/src/types/weapons.ts`

Add your weapon to the `WEAPON_TYPES` constant:

```typescript
export const WEAPON_TYPES = {
  KNIFE: "knife",
  SHOTGUN: "shotgun",
  PISTOL: "pistol",
  GRENADE: "grenade",
  BOLT_ACTION_RIFLE: "bolt_action_rifle", // Add your weapon here
} as const;
```

**Important:** The weapon type ID you use here will also be used for the sound file name by default.

#### B. Add Weapon Configuration

**File:** `packages/game-shared/src/entities/weapon-configs.ts`

Add weapon stats, sprite configuration, and sound:

```typescript
[WEAPON_TYPES.BOLT_ACTION_RIFLE]: {
  id: WEAPON_TYPES.BOLT_ACTION_RIFLE,
  stats: {
    cooldown: 2.0,        // Time between shots in seconds
    damage: 3,            // Optional: damage per hit (for melee)
    spreadAngle: 8,       // Optional: for shotgun-style spread
    pushDistance: 12,     // Optional: for knockback
  },
  assets: {
    assetPrefix: "bolt_action_rifle",
    spritePositions: {
      right: { x: 0, y: 64 },   // Sprite position for right-facing
      down: { x: 17, y: 64 },    // Sprite position for down-facing
      up: { x: 34, y: 64 },      // Sprite position for up-facing
      // Left is automatically right flipped
    },
    sheet: "items",               // Which sprite sheet to use
  },
  sound: "bolt_action_rifle",     // Sound file name (without .mp3) to play when fired
},
```

#### C. Add Entity Constants

**File:** `packages/game-shared/src/constants/index.ts`

Add your weapon and ammo to the `Entities` object:

```typescript
export const Entities = {
  // ... existing entities ...
  PISTOL: "pistol",
  SHOTGUN: "shotgun",
  KNIFE: "knife",
  BOLT_ACTION_RIFLE: "bolt_action_rifle", // Add weapon
  PISTOL_AMMO: "pistol_ammo",
  SHOTGUN_AMMO: "shotgun_ammo",
  BOLT_ACTION_AMMO: "bolt_action_ammo", // Add ammo
  // ... rest of entities ...
} as const;
```

#### D. Add Ammo Configuration (if applicable)

**File:** `packages/game-shared/src/entities/item-configs.ts`

Add ammo item configuration:

```typescript
bolt_action_ammo: {
  id: "bolt_action_ammo",
  category: "ammo",
  assets: {
    assetKey: "bolt_action_ammo",
    x: 16,                    // Sprite X position
    y: 64,                    // Sprite Y position
    sheet: "items",           // Which sprite sheet
  },
},
```

#### E. Add Sound File and Configuration

**File:** `packages/game-client/src/managers/sound-manager.ts`

Add your weapon sound to the `SOUND_TYPES_TO_MP3` constant:

```typescript
export const SOUND_TYPES_TO_MP3 = {
  // ... existing sounds ...
  BOLT_ACTION_RIFLE: "bolt_action_rifle", // Add your weapon sound
  AK47: "ak47",
} as const;
```

**Sound File Location:** Place your sound file at `packages/website/public/sounds/[weapon-name].mp3`

For example: `packages/website/public/sounds/bolt_action_rifle.mp3`

**Note:** The sound configuration in `weapon-configs.ts` (step B) determines which sound file plays when the weapon is fired. The sound system will automatically play the configured sound - no manual event handling needed!

### 2. Server-Side Implementation (game-server package)

#### A. Create Weapon Class

**File:** `packages/game-server/src/entities/weapons/bolt-action-rifle.ts`

Create the weapon entity class:

```typescript
import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { WEAPON_TYPES } from "@shared/types/weapons";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import { weaponRegistry } from "@shared/entities";
import { consumeAmmo } from "./helpers";

export class BoltActionRifle extends Weapon {
  private config = weaponRegistry.get(WEAPON_TYPES.BOLT_ACTION_RIFLE)!;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, WEAPON_TYPES.BOLT_ACTION_RIFLE);
  }

  public getCooldown(): number {
    return this.config.stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);

    // Check if player has ammo (for guns)
    if (!consumeAmmo(inventory, "bolt_action_ammo")) {
      this.getEntityManager()
        .getBroadcaster()
        .broadcastEvent(new GunEmptyEvent(playerId));
      return;
    }

    // Create bullet with custom damage (default is 1)
    const bullet = new Bullet(this.getGameManagers(), 3);
    bullet.setPosition(position);
    bullet.setDirection(facing);
    bullet.setShooterId(playerId);
    this.getEntityManager().addEntity(bullet);

    // Broadcast attack event
    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: WEAPON_TYPES.BOLT_ACTION_RIFLE,
        })
      );
  }
}
```

**Note:** For shotgun-style weapons, use `bullet.setDirectionWithOffset()` with the spread angle from config.

#### B. Create Ammo Class (if applicable)

**File:** `packages/game-server/src/entities/items/bolt-action-ammo.ts`

```typescript
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class BoltActionAmmo extends StackableItem {
  public static readonly DEFAULT_AMMO_COUNT = 10;

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      Entities.BOLT_ACTION_AMMO,
      "bolt_action_ammo", // Item type for inventory
      BoltActionAmmo.DEFAULT_AMMO_COUNT,
      "bolt action ammo" // Display name
    );
  }

  protected getDefaultCount(): number {
    return BoltActionAmmo.DEFAULT_AMMO_COUNT;
  }
}
```

#### C. Register in Entity Manager

**File:** `packages/game-server/src/managers/entity-manager.ts`

1. Add imports at the top:

```typescript
import { BoltActionRifle } from "@/entities/weapons/bolt-action-rifle";
import { BoltActionAmmo } from "@/entities/items/bolt-action-ammo";
```

2. Add to `entityMap`:

```typescript
const entityMap = {
  // ... existing entities ...
  [Entities.BOLT_ACTION_RIFLE]: BoltActionRifle,
  [Entities.BOLT_ACTION_AMMO]: BoltActionAmmo,
  // ... rest of entities ...
};
```

3. Register in `registerDefaultItems()` method:

```typescript
private registerDefaultItems() {
  // ... existing registrations ...

  // Register weapons
  this.registerItem("bolt_action_rifle", BoltActionRifle);

  // Register ammo
  this.registerItem("bolt_action_ammo", BoltActionAmmo);
}
```

### 3. Client-Side Implementation (game-client package)

#### A. Create Weapon Renderer

**File:** `packages/game-client/src/entities/weapons/bolt-action-rifle.ts`

```typescript
import { RawEntity } from "@shared/types/entity";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { ImageLoader } from "@/managers/asset";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";

export class BoltActionRifleClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, imageLoader: ImageLoader) {
    super(data, imageLoader);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
    const image = this.imageLoader.get("bolt_action_rifle");
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    ctx.drawImage(image, position.x, position.y);
  }
}
```

#### B. Create Ammo Renderer

**File:** `packages/game-client/src/entities/weapons/bolt-action-ammo.ts`

```typescript
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { Z_INDEX } from "@shared/map";
import { ClientEntity } from "@/entities/client-entity";
import { RawEntity } from "@shared/types/entity";
import { ClientPositionable } from "@/extensions";

export class BoltActionAmmoClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const image = this.imageLoader.get("bolt_action_ammo");
    ctx.drawImage(image, position.x, position.y);
  }
}
```

#### C. Register in Entity Factory

**File:** `packages/game-client/src/entities/entity-factory.ts`

1. Add imports:

```typescript
import { BoltActionRifleClient } from "@/entities/weapons/bolt-action-rifle";
import { BoltActionAmmoClient } from "@/entities/weapons/bolt-action-ammo";
```

2. Add to `entityMap`:

```typescript
export const entityMap = {
  // ... existing entities ...
  [Entities.BOLT_ACTION_RIFLE]: BoltActionRifleClient,
  [Entities.BOLT_ACTION_AMMO]: BoltActionAmmoClient,
  // ... rest of entities ...
} as const;
```

## Complete File Checklist

When adding a new weapon, you need to modify these files:

### Shared Package

- [ ] `packages/game-shared/src/types/weapons.ts` - Add weapon type
- [ ] `packages/game-shared/src/entities/weapon-configs.ts` - Add weapon config (including sound)
- [ ] `packages/game-shared/src/constants/index.ts` - Add entity constants
- [ ] `packages/game-shared/src/entities/item-configs.ts` - Add ammo config (if applicable)

### Server Package

- [ ] `packages/game-server/src/entities/weapons/[weapon-name].ts` - Create weapon class
- [ ] `packages/game-server/src/entities/items/[ammo-name].ts` - Create ammo class (if applicable)
- [ ] `packages/game-server/src/managers/entity-manager.ts` - Register entities
- [ ] `packages/game-server/src/entities/projectiles/bullet.ts` - Modify if custom damage needed

### Client Package

- [ ] `packages/game-client/src/entities/weapons/[weapon-name].ts` - Create weapon renderer
- [ ] `packages/game-client/src/entities/weapons/[ammo-name].ts` - Create ammo renderer (if applicable)
- [ ] `packages/game-client/src/entities/entity-factory.ts` - Register entities
- [ ] `packages/game-client/src/managers/sound-manager.ts` - Add sound type to SOUND_TYPES_TO_MP3
- [ ] `packages/website/public/sounds/[weapon-name].mp3` - Add sound file

## Testing

After adding all files:

1. Build the server to check for TypeScript errors:

   ```bash
   npm run build:server
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Spawn the weapon and ammo in-game using the entity IDs:
   - Weapon: `bolt_action_rifle`
   - Ammo: `bolt_action_ammo`

4. Test weapon functionality:
   - Pick up the weapon and ammo
   - Fire the weapon to verify:
     - Sound plays correctly
     - Projectiles/damage work as expected
     - Cooldown is appropriate
     - Visual effects appear (if applicable)

## Weapon Types Reference

### Projectile Weapons (Pistol, Shotgun, Rifle)

- Extend `Weapon` class
- Use `Bullet` projectile with configurable damage
- Consume ammo from inventory via `consumeAmmo()`
- Broadcast `GunEmptyEvent` when out of ammo
- Broadcast `PlayerAttackedEvent` on successful attack

### Melee Weapons (Knife)

- Extend `Weapon` class
- Deal direct damage to nearby enemies
- Use `damage` and `pushDistance` stats
- No ammo consumption

### Special Considerations

**Custom Damage:**
The `Bullet` class accepts an optional damage parameter:

```typescript
const bullet = new Bullet(this.getGameManagers(), 3); // 3 damage
```

Default damage is 1 if not specified.

**Spread Fire (Shotgun-style):**
For weapons with `spreadAngle` stat, create multiple bullets with offset angles:

```typescript
bullet.setDirectionWithOffset(facing, offsetAngle);
```

**Sprite Sheets:**

- Weapons typically use the `"default"` or `"items"` sprite sheet
- Ammo typically uses the `"items"` sprite sheet
- Specify in the asset configuration

**Weapon Sounds:**

The sound system is now fully automated through the weapon config:

1. Add a `sound` property to your weapon config (step 1B above)
2. Add the sound type to `SOUND_TYPES_TO_MP3` in sound-manager.ts
3. Place the `.mp3` file in `packages/website/public/sounds/`
4. The sound will automatically play when the weapon is fired

Example:
```typescript
// In weapon-configs.ts
sound: "bolt_action_rifle"  // References bolt_action_rifle.mp3

// In sound-manager.ts
BOLT_ACTION_RIFLE: "bolt_action_rifle"
```

No need to manually handle sound events - the client event listener automatically looks up and plays the configured sound!

## Example: Bolt Action Rifle Summary

The Bolt Action Rifle implementation demonstrates:

- **Fire Rate:** 2 second cooldown (0.5 shots per second)
- **Damage:** 3 damage per bullet (3x pistol damage)
- **Ammo:** Uses bolt_action_ammo (10 rounds per pickup)
- **Sprite Location:** (0, 64) on items sheet for weapon, (16, 64) for ammo

Total files modified: **11 files** (3 shared, 4 server, 4 client)
