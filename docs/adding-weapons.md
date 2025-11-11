# Adding Weapons to Survive the Night

This guide documents the complete process for adding a new weapon to the game using the simplified, data-driven approach.

## Overview

Adding a weapon is now much simpler! The system automatically handles most of the registration. You only need to:

1. Add weapon configuration (required)
2. Create server/client classes (only if custom behavior needed)
3. Register custom classes (only if custom behavior needed)
4. Add sound configuration

**For simple weapons:** Just add the config and you're done! The system auto-generates everything else.

## Quick Start: Simple Weapon (No Custom Behavior)

If your weapon just shoots bullets with standard behavior, you only need:

### 1. Add Weapon Configuration

**File:** `packages/game-shared/src/entities/weapon-configs.ts`

```typescript
export const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
  // ... existing weapons ...
  my_weapon: {
    id: "my_weapon",
    stats: {
      cooldown: 0.5,
      // Optional: damage, spreadAngle, pushDistance
    },
    assets: {
      assetPrefix: "my_weapon",
      spritePositions: {
        right: { x: 0, y: 64 },
        down: { x: 17, y: 64 },
        up: { x: 34, y: 64 },
      },
      sheet: "items", // or "default"
    },
    sound: "my_weapon",
    spawn: {
      enabled: true,
      chance: 0.002, // Optional: spawn chance on map
    },
  },
};
```

### 2. Add Sound Configuration

**File:** `packages/game-client/src/managers/sound-manager.ts`

```typescript
export const SOUND_TYPES_TO_MP3 = {
  // ... existing sounds ...
  MY_WEAPON: "my_weapon",
} as const;
```

**Sound File:** Place `my_weapon.mp3` in `packages/website/public/sounds/`

**That's it!** The weapon will:
- ✅ Auto-appear in Entities constant
- ✅ Auto-generate server entity (if no custom class)
- ✅ Auto-generate client entity (if no custom class)
- ✅ Work in spawn system (if spawn.enabled = true)
- ✅ Work in merchant system (if merchant.enabled = true)
- ✅ Work in recipe system (if recipe.enabled = true)

## Complete Guide: Custom Weapon Behavior

If your weapon needs custom logic (custom damage, spread fire, special effects), follow these steps:

### 1. Shared Configuration Files (game-shared package)

#### A. Add Weapon Configuration

**File:** `packages/game-shared/src/entities/weapon-configs.ts`

```typescript
// Use string literals directly (not WEAPON_TYPES) to avoid circular dependencies
export const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
  // ... existing weapons ...
  my_weapon: {
    id: "my_weapon",
    stats: {
      cooldown: 2.0,        // Time between shots in seconds
      damage: 3,            // Optional: damage per hit (for melee)
      spreadAngle: 8,       // Optional: for shotgun-style spread
      pushDistance: 12,     // Optional: for knockback
    },
    assets: {
      assetPrefix: "my_weapon",
      spritePositions: {
        right: { x: 0, y: 64 },   // Sprite position for right-facing
        down: { x: 32, y: 64 },   // Sprite position for down-facing
        up: { x: 16, y: 64 },     // Sprite position for up-facing
        // Left is automatically right flipped
      },
      sheet: "items",             // Which sprite sheet to use
    },
    sound: "my_weapon",           // Sound file name (without .mp3)
    spawn: {
      enabled: true,               // Optional: enable random spawning
      chance: 0.002,               // Spawn chance per tile (0.0 to 1.0)
    },
    merchant: {
      enabled: true,               // Optional: enable merchant sales
      price: 100,                  // Price in coins
    },
  },
};
```

**Important Notes:**
- Use string literals (`"my_weapon"`) as keys, NOT `WEAPON_TYPES.MY_WEAPON` (avoids circular dependency)
- The `assetPrefix` should match the weapon ID
- Assets are auto-generated from this config (no manual asset registration needed)

#### B. Add Ammo Configuration (if applicable)

**File:** `packages/game-shared/src/entities/item-configs.ts`

```typescript
export const ITEM_CONFIGS: Record<string, ItemConfig> = {
  // ... existing items ...
  my_weapon_ammo: {
    id: "my_weapon_ammo",
    category: "ammo",
    assets: {
      assetKey: "my_weapon_ammo",
      x: 16,                    // Sprite X position
      y: 64,                    // Sprite Y position
      sheet: "items",          // Which sprite sheet
    },
    spawn: {
      enabled: true,
      chance: 0.005,
    },
    merchant: {
      enabled: true,
      price: 10,
    },
  },
};
```

**Note:** Ammo is automatically registered - no manual entity registration needed unless you need custom behavior.

### 2. Server-Side Implementation (game-server package)

#### A. Create Weapon Class (only if custom behavior needed)

**File:** `packages/game-server/src/entities/weapons/my-weapon.ts`

```typescript
import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "@shared/util/direction";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import { weaponRegistry } from "@shared/entities";
import { consumeAmmo } from "./helpers";

export class MyWeapon extends Weapon {
  private config = weaponRegistry.get("my_weapon")!;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "my_weapon");
  }

  public getCooldown(): number {
    return this.config.stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);

    // Check if player has ammo (for guns)
    if (!consumeAmmo(inventory, "my_weapon_ammo")) {
      this.getEntityManager()
        .getBroadcaster()
        .broadcastEvent(new GunEmptyEvent(playerId));
      return;
    }

    // Create bullet with custom damage
    const bullet = new Bullet(this.getGameManagers(), this.config.stats.damage || 1);
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
          weaponKey: "my_weapon",
        })
      );
  }
}
```

**Note:** For shotgun-style weapons with spread, create multiple bullets with offset angles using `bullet.setDirectionWithOffset()`.

#### B. Create Ammo Class (only if custom behavior needed)

**File:** `packages/game-server/src/entities/items/my-weapon-ammo.ts`

```typescript
import { IGameManagers } from "@/managers/types";
import { StackableItem } from "@/entities/items/stackable-item";

export class MyWeaponAmmo extends StackableItem {
  public static readonly DEFAULT_AMMO_COUNT = 10;

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      "my_weapon_ammo", // Entity type
      "my_weapon_ammo", // Item type for inventory
      MyWeaponAmmo.DEFAULT_AMMO_COUNT,
      "my weapon ammo" // Display name
    );
  }

  protected getDefaultCount(): number {
    return MyWeaponAmmo.DEFAULT_AMMO_COUNT;
  }
}
```

**Note:** If you don't need custom behavior, skip this step - the generic item entity will handle it automatically.

#### C. Register Custom Classes

**File:** `packages/game-server/src/entities/register-custom-entities.ts`

```typescript
import { MyWeapon } from "@/entities/weapons/my-weapon";
import { MyWeaponAmmo } from "@/entities/items/my-weapon-ammo";

export function registerCustomEntities(): void {
  // ... existing registrations ...
  
  // Weapons
  entityOverrideRegistry.register("my_weapon", MyWeapon);
  
  // Ammo (only if custom class exists)
  entityOverrideRegistry.register("my_weapon_ammo", MyWeaponAmmo);
}
```

**Important:** Use string literals (`"my_weapon"`), NOT `Entities.MY_WEAPON` to avoid circular dependencies.

### 3. Client-Side Implementation (game-client package)

#### A. Create Weapon Renderer (only if custom rendering needed)

**File:** `packages/game-client/src/entities/weapons/my-weapon.ts`

```typescript
import { RawEntity } from "@shared/types/entity";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { AssetManager } from "@/managers/asset";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";

export class MyWeaponClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
    const image = this.imageLoader.get("my_weapon");
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    ctx.drawImage(image, position.x, position.y);
  }
}
```

**Note:** If you don't need custom rendering, skip this step - the generic client entity will handle it automatically.

#### B. Create Ammo Renderer (only if custom rendering needed)

**File:** `packages/game-client/src/entities/weapons/my-weapon-ammo.ts`

```typescript
import { RawEntity } from "@shared/types/entity";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { AssetManager } from "@/managers/asset";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";

export class MyWeaponAmmoClient extends ClientEntity implements Renderable {
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
    const image = this.imageLoader.get("my_weapon_ammo");
    ctx.drawImage(image, position.x, position.y);
  }
}
```

**Note:** If you don't need custom rendering, skip this step - the generic client entity will handle it automatically.

#### C. Register Custom Classes

**File:** `packages/game-client/src/entities/register-custom-entities.ts`

```typescript
import { MyWeaponClient } from "@/entities/weapons/my-weapon";
import { MyWeaponAmmoClient } from "@/entities/weapons/my-weapon-ammo";

export function registerCustomClientEntities(): void {
  // ... existing registrations ...
  
  // Weapons
  clientEntityOverrideRegistry.register("my_weapon", MyWeaponClient);
  
  // Ammo (only if custom class exists)
  clientEntityOverrideRegistry.register("my_weapon_ammo", MyWeaponAmmoClient);
}
```

**Important:** Use string literals (`"my_weapon"`), NOT `Entities.MY_WEAPON` to avoid circular dependencies.

#### D. Add Sound Configuration

**File:** `packages/game-client/src/managers/sound-manager.ts`

```typescript
export const SOUND_TYPES_TO_MP3 = {
  // ... existing sounds ...
  MY_WEAPON: "my_weapon",
} as const;
```

**Sound File:** Place `my_weapon.mp3` in `packages/website/public/sounds/`

## Complete File Checklist

### Simple Weapon (No Custom Behavior)

- [x] `packages/game-shared/src/entities/weapon-configs.ts` - Add weapon config
- [x] `packages/game-client/src/managers/sound-manager.ts` - Add sound type
- [x] `packages/website/public/sounds/[weapon-name].mp3` - Add sound file
- [x] `packages/game-shared/src/entities/item-configs.ts` - Add ammo config (if applicable)

**That's it!** Everything else is auto-generated.

### Custom Weapon (With Custom Behavior)

#### Shared Package
- [x] `packages/game-shared/src/entities/weapon-configs.ts` - Add weapon config
- [x] `packages/game-shared/src/entities/item-configs.ts` - Add ammo config (if applicable)

#### Server Package
- [x] `packages/game-server/src/entities/weapons/[weapon-name].ts` - Create weapon class
- [x] `packages/game-server/src/entities/items/[ammo-name].ts` - Create ammo class (if custom behavior needed)
- [x] `packages/game-server/src/entities/register-custom-entities.ts` - Register custom classes

#### Client Package
- [x] `packages/game-client/src/entities/weapons/[weapon-name].ts` - Create weapon renderer (if custom rendering needed)
- [x] `packages/game-client/src/entities/weapons/[ammo-name].ts` - Create ammo renderer (if custom rendering needed)
- [x] `packages/game-client/src/entities/register-custom-entities.ts` - Register custom classes
- [x] `packages/game-client/src/managers/sound-manager.ts` - Add sound type
- [x] `packages/website/public/sounds/[weapon-name].mp3` - Add sound file

## What's Automatic

The following are **automatically handled** - you don't need to manually update them:

- ✅ **Entities constant** - Auto-generated from configs
- ✅ **Server entity creation** - Auto-generated from configs (unless custom class registered)
- ✅ **Client entity creation** - Auto-generated from configs (unless custom class registered)
- ✅ **Asset loading** - Auto-generated from configs
- ✅ **Spawn system** - Reads from `spawn.enabled` in config
- ✅ **Merchant system** - Reads from `merchant.enabled` in config
- ✅ **Recipe system** - Reads from `recipe.enabled` in config

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
   - Weapon: `my_weapon`
   - Ammo: `my_weapon_ammo`

4. Test weapon functionality:
   - Pick up the weapon and ammo
   - Fire the weapon to verify:
     - Sound plays correctly
     - Projectiles/damage work as expected
     - Cooldown is appropriate
     - Visual effects appear (if applicable)
   - Check inventory rendering
   - Check held weapon rendering

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
The sound system is fully automated through the weapon config:
1. Add a `sound` property to your weapon config
2. Add the sound type to `SOUND_TYPES_TO_MP3` in sound-manager.ts
3. Place the `.mp3` file in `packages/website/public/sounds/`
4. The sound will automatically play when the weapon is fired

## Example: Simple Weapon Summary

For a weapon with standard behavior, you only need to modify **3 files**:
1. `weapon-configs.ts` - Add weapon config
2. `sound-manager.ts` - Add sound type
3. Add sound file to `public/sounds/`

Everything else (entities, assets, registration) is automatic!

## Example: Custom Weapon Summary

For a weapon with custom behavior, you need to modify **8-10 files**:
1. `weapon-configs.ts` - Add weapon config
2. `item-configs.ts` - Add ammo config (if applicable)
3. Server weapon class - Create custom weapon logic
4. Server ammo class - Create custom ammo logic (if needed)
5. Client weapon class - Create custom rendering (if needed)
6. Client ammo class - Create custom rendering (if needed)
7. `register-custom-entities.ts` (server) - Register custom classes
8. `register-custom-entities.ts` (client) - Register custom classes
9. `sound-manager.ts` - Add sound type
10. Add sound file to `public/sounds/`

## Troubleshooting

### Weapon doesn't appear in game
- Check that weapon config uses string literals as keys (not WEAPON_TYPES)
- Verify `id` matches the key in WEAPON_CONFIGS
- Check browser console for asset loading errors

### Weapon assets not loading
- Verify `assetPrefix` matches weapon ID
- Check that sprite positions are correct
- Ensure sprite sheet exists and is loaded

### Sound doesn't play
- Verify sound property in weapon config matches sound file name
- Check that sound type is added to SOUND_TYPES_TO_MP3
- Ensure sound file exists in `public/sounds/`

### Custom class not being used
- Verify registration in `register-custom-entities.ts`
- Check that entity type string matches exactly
- Ensure custom class extends correct base class
