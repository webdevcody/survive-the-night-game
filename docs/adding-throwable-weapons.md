# Guide: Adding Throwable Weapons

This guide documents all the changes required to add a new throwable weapon (like grenades or Molotov cocktails) that:
- Can be thrown by players
- Shows up in the buy menu
- Can be crafted via recipes
- Properly syncs between server and client

## Overview

Throwable weapons are weapons that can be thrown, travel through the air, and explode/activate after a delay. They follow a similar pattern to grenades but can have different explosion effects.

## Files to Create

### 1. Server-Side Entity Class
**Location:** `packages/game-server/src/entities/items/{weapon-name}.ts`

**Template:**
```typescript
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Destructible from "@/extensions/destructible";
import { Direction } from "@shared/util/direction";
import { Cooldown } from "@/entities/util/cooldown";
import Inventory from "@/extensions/inventory";
import { normalizeDirection } from "@shared/util/direction";
import Updatable from "@/extensions/updatable";
import { ExplosionEvent } from "../../../../game-shared/src/events/server-sent/events/explosion-event";
import { Weapon } from "@/entities/weapons/weapon";
import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import { ItemState } from "@/types/entity";
import { Entities } from "@/constants";

export class YourThrowableWeapon extends Weapon {
  // Configuration constants
  private static readonly EXPLOSION_RADIUS = 64;
  private static readonly EXPLOSION_DAMAGE = 5;
  private static readonly THROW_SPEED = 130;
  private static readonly EXPLOSION_DELAY = 1; // seconds
  private static readonly COOLDOWN = 0.5;
  private static readonly DEFAULT_COUNT = 1;

  // Instance variables
  private velocity: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private isArmed: boolean = false;
  private explosionTimer: Cooldown;
  private isExploded: boolean = false;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, "your_weapon_id");

    this.explosionTimer = new Cooldown(YourThrowableWeapon.EXPLOSION_DELAY);

    // Add Updatable extension for physics after it's thrown
    this.addExtension(new Updatable(this, this.updateWeapon.bind(this)));

    // Make stackable by setting count from itemState or default
    if (this.hasExt(Carryable)) {
      const carryable = this.getExt(Carryable);
      const count = itemState?.count ?? YourThrowableWeapon.DEFAULT_COUNT;
      carryable.setItemState({ count });
    }

    // Override Interactive callback to use merge strategy for stacking
    if (this.hasExt(Interactive)) {
      const interactive = this.getExt(Interactive);
      interactive.onInteract((entityId: number) => {
        const carryable = this.getExt(Carryable);
        carryable.pickup(
          entityId,
          Carryable.createStackablePickupOptions(carryable, YourThrowableWeapon.DEFAULT_COUNT)
        );
      });
    }
  }

  public getCooldown(): number {
    return YourThrowableWeapon.COOLDOWN;
  }

  public attack(
    playerId: number,
    position: { x: number; y: number },
    facing: Direction,
    aimAngle?: number
  ): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player || !player.hasExt(Positionable)) return;

    const playerPos = player.getExt(Positionable).getCenterPosition();
    const inventory = player.getExt(Inventory);

    // Find the weapon in inventory
    const inventoryItems = inventory.getItems();
    const weaponIndex = inventoryItems.findIndex(
      (item) => item && item.itemType === this.getType()
    );
    if (weaponIndex === -1) return;

    const weaponItem = inventoryItems[weaponIndex];
    if (!weaponItem) return;

    // Decrement count for stackable weapons
    const currentCount = weaponItem.state?.count || 1;
    if (currentCount > 1) {
      inventory.updateItemState(weaponIndex, { count: currentCount - 1 });
    } else {
      inventory.removeItem(weaponIndex);
    }

    // Set weapon position to player position
    this.getExt(Positionable).setPosition(playerPos);

    // Set velocity based on aim angle if provided (mouse aiming), otherwise use facing direction
    if (aimAngle !== undefined) {
      const dirX = Math.cos(aimAngle);
      const dirY = Math.sin(aimAngle);
      const poolManager = PoolManager.getInstance();
      this.velocity = poolManager.vector2.claim(
        dirX * YourThrowableWeapon.THROW_SPEED,
        dirY * YourThrowableWeapon.THROW_SPEED
      );
    } else {
      const directionVector = normalizeDirection(facing);
      const poolManager = PoolManager.getInstance();
      this.velocity = poolManager.vector2.claim(directionVector.x, directionVector.y);
      this.velocity.mul(YourThrowableWeapon.THROW_SPEED);
    }

    // Arm the weapon
    this.isArmed = true;

    // Add to world
    this.getEntityManager().addEntity(this);
  }

  private updateWeapon(deltaTime: number): void {
    if (!this.isArmed) return;

    // Update position based on velocity
    const pos = this.getExt(Positionable).getPosition();
    const poolManager = PoolManager.getInstance();
    const velocityScaled = poolManager.vector2.claim(this.velocity.x, this.velocity.y);
    velocityScaled.mul(deltaTime);
    const newPos = pos.clone().add(velocityScaled);
    poolManager.vector2.release(velocityScaled);
    this.getExt(Positionable).setPosition(newPos);

    // Apply friction to slow down
    this.velocity.mul(0.95);

    // Update explosion timer
    this.explosionTimer.update(deltaTime);
    if (this.explosionTimer.isReady()) {
      this.explode();
    }
  }

  private explode(): void {
    if (this.isExploded) return;
    this.isExploded = true;

    const position = this.getExt(Positionable).getCenterPosition();
    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      position,
      YourThrowableWeapon.EXPLOSION_RADIUS
    );

    // Damage all destructible entities in explosion radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible)) continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = position.distance(entityPos);

      if (dist <= YourThrowableWeapon.EXPLOSION_RADIUS) {
        // Scale damage based on distance from explosion
        const damageScale = 1 - dist / YourThrowableWeapon.EXPLOSION_RADIUS;
        const damage = Math.ceil(YourThrowableWeapon.EXPLOSION_DAMAGE * damageScale);
        entity.getExt(Destructible).damage(damage);
      }
    }

    // Add custom explosion effects here (e.g., spawn fire entities, create particles, etc.)

    // Broadcast explosion event for client to show particle effect
    this.getEntityManager().getBroadcaster().broadcastEvent(
      new ExplosionEvent({
        position,
      })
    );

    // Remove the weapon
    this.getEntityManager().markEntityForRemoval(this);
  }
}
```

**Key Points:**
- Extends `Weapon` base class
- Uses `Updatable` extension for physics simulation
- Implements stackable item support via `Carryable` extension
- Handles both keyboard and mouse aiming
- Applies friction to slow down over time
- Explodes after a delay timer

### 2. Client-Side Entity Class
**Location:** `packages/game-client/src/entities/items/{weapon-name}.ts`

**Template:**
```typescript
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";

export class YourThrowableWeaponClient extends ClientEntity implements Renderable {
  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const image = this.getImage();
    ctx.drawImage(image, position.x, position.y);
  }
}
```

**Key Points:**
- Implements `Renderable` interface
- Uses `Z_INDEX.ITEMS` for proper layering
- Renders the weapon sprite at its position

## Files to Modify

### 1. Weapon Configuration
**File:** `packages/game-shared/src/entities/weapon-configs.ts`

**Add entry to `WEAPON_CONFIGS` object:**
```typescript
your_weapon_id: {
  id: "your_weapon_id",
  type: "ranged",
  stats: {
    cooldown: 0.5, // Time between throws in seconds
    cameraShakeIntensity: 0.5, // Camera shake on throw
  },
  assets: {
    assetPrefix: "your_weapon_id", // Must match sprite asset name
    spritePositions: {
      right: { x: 80, y: 0 }, // Sprite position in sprite sheet
      up: { x: 80, y: 0 },
      down: { x: 80, y: 0 },
    },
    sheet: "items", // Which sprite sheet to use
  },
  sound: "pistol", // Sound effect name (without .mp3)
  merchant: {
    enabled: true, // Show in merchant shop
    buyable: true, // Appears in buy menu
    price: 25, // Price in coins
  },
  recipe: {
    enabled: true, // Enable crafting
    components: [
      { type: "gasoline" }, // Inventory item component
      { type: "cloth" }     // Resource component (from resources bag)
    ],
    resultCount: 2, // Number of items created (defaults to 1 if omitted)
  },
},
```

**Key Points:**
- `id` must match the entity type string used in constructor
- `assetPrefix` must match your sprite asset name
- `spritePositions` define where the sprite is in the sprite sheet
- `merchant.enabled` and `merchant.buyable` control shop visibility
- `recipe.components` can include both inventory items and resources
- `recipe.resultCount` allows creating multiple items per craft

### 2. Server Entity Registry
**File:** `packages/game-server/src/entities/register-custom-entities.ts`

**Add import at top:**
```typescript
import { YourThrowableWeapon } from "@/entities/items/your-weapon-name";
```

**Add registration in `registerCustomEntities()` function:**
```typescript
// Items with custom behavior section
entityOverrideRegistry.register("your_weapon_id", YourThrowableWeapon);
```

**Key Points:**
- Import path must match your file location
- Registration string must match the weapon `id` in config
- Place in appropriate section (items, weapons, etc.)

### 3. Client Entity Registry
**File:** `packages/game-client/src/entities/register-custom-entities.ts`

**Add import at top:**
```typescript
import { YourThrowableWeaponClient } from "./items/your-weapon-name";
```

**Add registration in `registerCustomClientEntities()` function:**
```typescript
// Items with custom behavior section
clientEntityOverrideRegistry.register("your_weapon_id", YourThrowableWeaponClient);
```

**Key Points:**
- Import path uses relative path (`./items/`)
- Registration string must match server registration

### 4. Recipe System (if creating multiple items)
**File:** `packages/game-shared/src/util/recipes.ts`

**Already updated to support `resultCount` - no changes needed unless adding new functionality.**

The recipe system now supports:
- `resultCount` in `RecipeConfig` interface
- Creating multiple items per craft operation
- Proper stacking when items already exist in inventory

## Optional Customizations

### Custom Explosion Effects

For weapons like Molotov Cocktail that spawn additional entities:

```typescript
private explode(): void {
  // ... damage logic ...

  // Spawn custom entities (e.g., fire)
  this.spawnCustomEffects(position);

  // ... rest of explosion logic ...
}

private spawnCustomEffects(centerPosition: Vector2): void {
  const poolManager = PoolManager.getInstance();
  const entityManager = this.getEntityManager();

  for (let i = 0; i < EFFECT_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * SPREAD_RADIUS;
    const effectPosition = poolManager.vector2.claim(
      centerPosition.x + Math.cos(angle) * distance,
      centerPosition.y + Math.sin(angle) * distance
    );

    const effect = entityManager.createEntity(Entities.EFFECT_TYPE);
    if (effect) {
      effect.getExt(Positionable).setPosition(effectPosition);
      entityManager.addEntity(effect);
    }

    poolManager.vector2.release(effectPosition);
  }
}
```

### Different Throw Mechanics

To modify throw behavior:
- Change `THROW_SPEED` constant for faster/slower throws
- Modify friction multiplier (`velocity.mul(0.95)`) for different deceleration
- Adjust `EXPLOSION_DELAY` for different fuse times
- Add gravity by modifying velocity in `updateWeapon()`

## Checklist

When adding a new throwable weapon, ensure:

- [ ] Server entity class created and extends `Weapon`
- [ ] Client entity class created and implements `Renderable`
- [ ] Weapon config added to `weapon-configs.ts`
- [ ] Registered in server entity registry
- [ ] Registered in client entity registry
- [ ] Recipe configured (if craftable)
- [ ] Sprite assets exist and match `assetPrefix`
- [ ] Sound file exists (if custom sound)
- [ ] Tested throwing mechanics
- [ ] Tested explosion/damage effects
- [ ] Tested crafting (if applicable)
- [ ] Tested buying from merchant (if applicable)
- [ ] Tested stacking behavior

## Example: Molotov Cocktail

As a reference, here's what was changed to add the Molotov Cocktail:

1. **Created:**
   - `packages/game-server/src/entities/items/molotov-cocktail.ts`
   - `packages/game-client/src/entities/items/molotov-cocktail.ts`

2. **Modified:**
   - `packages/game-shared/src/entities/weapon-configs.ts` - Added config with recipe
   - `packages/game-shared/src/entities/behavior-configs.ts` - Added `resultCount` to `RecipeConfig`
   - `packages/game-shared/src/util/recipes.ts` - Updated to support `resultCount`
   - `packages/game-server/src/entities/register-custom-entities.ts` - Registered server entity
   - `packages/game-client/src/entities/register-custom-entities.ts` - Registered client entity

3. **Key Features:**
   - Recipe: 1 gasoline + 1 cloth → 2 Molotov cocktails
   - Spawns 8 fire entities on explosion
   - Available in merchant shop for 25 coins
   - Stackable like grenades

## Notes

- **Entity Constants:** The `Entities` constant is auto-generated from weapon configs, so no manual addition needed
- **Serialization:** Weapon state is automatically serialized/deserialized via the extension system
- **Network Sync:** Position and state changes are automatically synced via the entity system
- **Stacking:** Stackable weapons use the `Carryable` extension with count state
- **Resources vs Items:** Recipe components can be either inventory items (like gasoline) or resources (like cloth/wood) from the resources bag

