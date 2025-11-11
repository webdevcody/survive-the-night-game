# Adding Inventory-Based Light Items

This guide explains how to add items that provide light when held in inventory (without needing to be equipped/selected), similar to the miners-hat.

## Overview

The miners-hat is an example of an item that provides passive lighting when in the player's inventory. Unlike the torch, which must be equipped (selected) to provide light, the miners-hat works automatically as long as it's in the inventory.

## Quick Start: Simple Item (No Custom Behavior)

If your item just needs to provide light when in inventory, you only need:

### 1. Add Item Configuration

**File:** `packages/game-shared/src/entities/item-configs.ts`

```typescript
export const ITEM_CONFIGS: Record<string, ItemConfig> = {
  // ... existing items ...
  my_light_item: {
    id: "my_light_item",
    category: "consumable",
    assets: {
      assetKey: "my_light_item",
      x: 0, // Sprite X position
      y: 0, // Sprite Y position
      sheet: "items", // Sprite sheet name
    },
    hideWhenSelected: true, // Don't render as held item (it's worn)
    spawn: {
      enabled: true, // Optional: enable random spawning
      chance: 0.0001, // Spawn chance per tile
    },
    merchant: {
      enabled: true, // Optional: enable merchant sales
      price: 50, // Price in coins
    },
  },
};
```

### 2. Update Player Lighting Logic

**File:** `packages/game-server/src/entities/player.ts`

Modify the `updateLighting()` method:

```typescript
private updateLighting() {
  const activeItem = this.activeItem;
  const hasTorchEquipped = activeItem?.itemType === "torch";
  const hasMyLightItem = this.hasInInventory("my_light_item");

  if (this.hasExt(Illuminated)) {
    const illuminated = this.getExt(Illuminated);
    illuminated.setRadius(hasTorchEquipped || hasMyLightItem ? 200 : 0);
  }
}
```

**That's it!** The item will:

- ✅ Auto-appear in Entities constant
- ✅ Auto-generate server entity
- ✅ Auto-generate client entity
- ✅ Work in spawn system (if spawn.enabled = true)
- ✅ Work in merchant system (if merchant.enabled = true)
- ✅ Work in recipe system (if recipe.enabled = true)

## Complete Guide: Custom Item Behavior

If your item needs custom logic or rendering, follow these steps:

### 1. Add Item Configuration

**File:** `packages/game-shared/src/entities/item-configs.ts`

```typescript
export const ITEM_CONFIGS: Record<string, ItemConfig> = {
  // ... existing items ...
  my_light_item: {
    id: "my_light_item",
    category: "consumable", // or appropriate category
    assets: {
      assetKey: "my_light_item",
      x: 0, // Sprite X position
      y: 0, // Sprite Y position
      sheet: "items", // Sprite sheet name
    },
    hideWhenSelected: true, // Optional: if true, don't render overlay when item is selected/equipped
    spawn: {
      enabled: true, // Optional: enable random spawning
      chance: 0.0001, // Spawn chance per tile (0.0 to 1.0)
    },
    merchant: {
      enabled: true, // Optional: enable merchant sales
      price: 50, // Price in coins
    },
    recipe: {
      enabled: true, // Optional: enable crafting
      components: [
        { type: "cloth", count: 2 },
        { type: "wood", count: 1 },
      ],
    },
  },
};
```

**hideWhenSelected Option:**

- Set to `true` if the item should NOT be rendered as a "held item" when selected/equipped
- Useful for wearable items (like miners-hat) that are worn rather than held
- When `true`: The item overlay always shows when in inventory (regardless of selection), but the item will NEVER show as a "held item" when selected
- When `false` or not specified: The item shows as a "held item" when selected (normal behavior)
- Defaults to `false` if not specified

**Category Options:**

- `"consumable"` - Items that can be used/consumed
- `"ammo"` - Ammunition items
- `"placeable"` - Items that can be placed as structures (NOT for inventory light items)
- `"throwable"` - Items that can be thrown
- `"structure"` - Structure items

### 2. Create Server-Side Entity (only if custom behavior needed)

**File:** `packages/game-server/src/entities/items/my-light-item.ts`

```typescript
import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";

export class MyLightItem extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "my_light_item");

    this.extensions = [
      new Positionable(this).setSize(MyLightItem.Size),
      new Interactive(this)
        .onInteract(this.interact.bind(this))
        .setDisplayName("my light item"),
      new Carryable(this, "my_light_item"),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }
}
```

**Note:** Unlike the torch, inventory light items should NOT include the `Illuminated` extension on the item itself. The light comes from the player when the item is in inventory.

**Note:** If you don't need custom behavior, skip this step - the generic item entity will handle it automatically.

### 3. Create Client-Side Entity (only if custom rendering needed)

**File:** `packages/game-client/src/entities/items/my-light-item.ts`

```typescript
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { RawEntity } from "@shared/types/entity";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";

export class MyLightItemClient extends ClientEntity implements Renderable {
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
    const image = this.imageLoader.get("my_light_item");
    ctx.drawImage(image, position.x, position.y);
  }
}
```

**Note:** If you don't need custom rendering, skip this step - the generic client entity will handle it automatically.

### 4. Register Custom Classes (only if custom classes created)

**File:** `packages/game-server/src/entities/register-custom-entities.ts`

```typescript
import { MyLightItem } from "@/entities/items/my-light-item";

export function registerCustomEntities(): void {
  // ... existing registrations ...
  entityOverrideRegistry.register("my_light_item", MyLightItem);
}
```

**File:** `packages/game-client/src/entities/register-custom-entities.ts`

```typescript
import { MyLightItemClient } from "@/entities/items/my-light-item";

export function registerCustomClientEntities(): void {
  // ... existing registrations ...
  clientEntityOverrideRegistry.register("my_light_item", MyLightItemClient);
}
```

**Important:** Use string literals (`"my_light_item"`), NOT `Entities.MY_LIGHT_ITEM` to avoid circular dependencies.

### 5. Update Player Lighting Logic

**File:** `packages/game-server/src/entities/player.ts`

Modify the `updateLighting()` method to check for your item in inventory:

```typescript
private updateLighting() {
  // Provide light if the player has a torch equipped or my_light_item in inventory
  const activeItem = this.activeItem;
  const hasTorchEquipped = activeItem?.itemType === "torch";
  const hasMyLightItem = this.hasInInventory("my_light_item");

  if (this.hasExt(Illuminated)) {
    const illuminated = this.getExt(Illuminated);
    // Set radius to 200 if torch equipped or my_light_item in inventory, 0 otherwise
    illuminated.setRadius(hasTorchEquipped || hasMyLightItem ? 200 : 0);
  }
}
```

**Key Points:**

- Use `this.hasInInventory("my_light_item")` to check if the item is in inventory
- The item does NOT need to be equipped (selected) to provide light
- Combine with other light sources using `||` operator

### 6. Add Player Overlay Rendering (optional)

If you want the item to render as an overlay on the player sprite when in inventory:

**File:** `packages/game-client/src/entities/player.ts`

Add a method similar to `renderMinersHat()`:

```typescript
renderMyLightItem(ctx: CanvasRenderingContext2D, renderPosition: Vector2) {
  const hasItem = this.inventory.some((item) => item.itemType === "my_light_item");
  if (hasItem) {
    const minersHatImage = this.imageLoader.get("my_light_item");
    ctx.drawImage(minersHatImage, renderPosition.x, renderPosition.y);
  }
}
```

Then call it in the `render()` method:

```typescript
public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
  // ... existing render code ...

  // Render overlays for inventory items
  this.renderMinersHat(ctx, renderPosition);
  this.renderMyLightItem(ctx, renderPosition); // Add this line
}
```

## Complete File Checklist

### Simple Item (No Custom Behavior)

- [x] `packages/game-shared/src/entities/item-configs.ts` - Add item config
- [x] `packages/game-server/src/entities/player.ts` - Update `updateLighting()` method
- [x] `packages/game-shared/src/util/inventory.ts` - Add to `ITEM_TYPES` array (for TypeScript type safety)

**Note:** `ITEM_TYPES` is still manually maintained for TypeScript type checking. This may be auto-generated in the future.

### Custom Item (With Custom Behavior)

#### Shared Package

- [x] `packages/game-shared/src/entities/item-configs.ts` - Add item config

#### Server Package

- [x] `packages/game-server/src/entities/items/[item-name].ts` - Create item class (if custom behavior needed)
- [x] `packages/game-server/src/entities/register-custom-entities.ts` - Register custom class (if created)
- [x] `packages/game-server/src/entities/player.ts` - Update `updateLighting()` method

#### Client Package

- [x] `packages/game-client/src/entities/items/[item-name].ts` - Create item renderer (if custom rendering needed)
- [x] `packages/game-client/src/entities/register-custom-entities.ts` - Register custom class (if created)
- [x] `packages/game-client/src/entities/player.ts` - Add overlay rendering (optional)

## What's Automatic

The following are **automatically handled** - you don't need to manually update them:

- ✅ **Entities constant** - Auto-generated from configs
- ✅ **Server entity creation** - Auto-generated from configs (unless custom class registered)
- ✅ **Client entity creation** - Auto-generated from configs (unless custom class registered)
- ✅ **Asset loading** - Auto-generated from configs
- ✅ **Spawn system** - Reads from `spawn.enabled` in config
- ✅ **Merchant system** - Reads from `merchant.enabled` in config
- ✅ **Recipe system** - Reads from `recipe.enabled` in config

## Important Notes

### Placement Restrictions

Inventory light items should **NOT** be placeable. Set `category: "consumable"` (or another non-placeable category) and ensure the item is NOT included in the placement whitelist in:

- `packages/game-client/src/managers/placement.ts`
- `packages/game-server/src/managers/server-socket-manager.ts`

### Differences from Torch

| Feature                          | Torch            | Inventory Light Item |
| -------------------------------- | ---------------- | -------------------- |
| Must be equipped                 | ✅ Yes           | ❌ No                |
| Provides light when in inventory | ❌ No            | ✅ Yes               |
| Can be placed                    | ✅ Yes           | ❌ No                |
| Has Illuminated extension        | ✅ Yes (on item) | ❌ No (on player)    |
| Category                         | `"placeable"`    | `"consumable"`       |

## Testing Checklist

- [ ] Item can be picked up from the ground
- [ ] Item appears in inventory
- [ ] Player emits light when item is in inventory (even if not selected)
- [ ] Item cannot be placed as a structure
- [ ] Item sprite renders correctly
- [ ] Item overlay renders on player when in inventory (if implemented)
- [ ] Item overlay always shows when in inventory (regardless of selection)
- [ ] Item does NOT show as "held item" when selected (if `hideWhenSelected: true`)
- [ ] Item can be dropped from inventory
- [ ] Light turns off when item is removed from inventory
- [ ] Item spawns on map (if `spawn.enabled = true`)
- [ ] Item can be bought from merchant (if `merchant.enabled = true`)
- [ ] Item can be crafted (if `recipe.enabled = true`)

## Example: Miners-Hat Implementation

The miners-hat serves as a complete reference implementation. Key files:

- **Server entity:** `packages/game-server/src/entities/items/miners-hat.ts`
- **Client entity:** `packages/game-client/src/entities/items/miners-hat.ts`
- **Player lighting:** `packages/game-server/src/entities/player.ts` (updateLighting method)
- **Player overlay rendering:** `packages/game-client/src/entities/player.ts` (renderMinersHat method)
- **Item config:** `packages/game-shared/src/entities/item-configs.ts` (includes `hideWhenSelected: true`)

**Key Features:**

- Provides light when in inventory (doesn't need to be equipped)
- Renders as overlay on player sprite when in inventory (always visible when in inventory)
- Never shows as a "held item" when selected (because it's worn, not held)

## Troubleshooting

### Item doesn't provide light

- Check that `updateLighting()` checks for the item using `hasInInventory()`
- Verify the item ID matches exactly in all files
- Ensure the item is actually in inventory (not just equipped)

### Item can be placed (shouldn't be)

- Verify category is NOT `"placeable"`
- Check that item is NOT in placement whitelist files

### Sprite doesn't render

- Verify sprite coordinates in `item-configs.ts`
- Check that sprite exists in sprite sheet
- Ensure `assetKey` matches the item ID

### Type errors

- Verify item ID is added correctly in `item-configs.ts`
- Check that imports use correct paths
- Ensure custom classes extend correct base classes

### Entity not found at runtime ("Unknown entity type")

- Verify custom class is registered in `register-custom-entities.ts` (if custom class exists)
- Check that entity type string matches exactly
- Ensure the item config is correctly defined
- If no custom class, verify the generic entity system is working (check console for errors)

### Item doesn't spawn on map

- Verify `spawn.enabled = true` in item config
- Check spawn chance is reasonable (0.0001 to 0.1)
- Ensure item category allows spawning

### Item doesn't appear in merchant

- Verify `merchant.enabled = true` in item config
- Check price is set correctly
- Ensure merchant system is reading from configs correctly
