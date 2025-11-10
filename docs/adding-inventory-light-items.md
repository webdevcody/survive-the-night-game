# Adding Inventory-Based Light Items

This guide explains how to add items that provide light when held in inventory (without needing to be equipped/selected), similar to the miners-hat.

## Overview

The miners-hat is an example of an item that provides passive lighting when in the player's inventory. Unlike the torch, which must be equipped (selected) to provide light, the miners-hat works automatically as long as it's in the inventory.

## Step-by-Step Guide

### 1. Create Server-Side Entity

Create a new file: `packages/game-server/src/entities/items/[item-name].ts`

```typescript
import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";

export class [ItemName] extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.[ITEM_CONSTANT]);

    this.extensions = [
      new Positionable(this).setSize([ItemName].Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("[display name]"),
      new Carryable(this, "[item_id]"),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }
}
```

**Note:** Unlike the torch, inventory light items should NOT include the `Illuminated` extension on the item itself. The light comes from the player when the item is in inventory.

### 2. Create Client-Side Entity

Create a new file: `packages/game-client/src/entities/items/[item-name].ts`

```typescript
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { RawEntity } from "@shared/types/entity";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";

export class [ItemName]Client extends ClientEntity implements Renderable {
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
    const image = this.imageLoader.get("[item_id]");
    ctx.drawImage(image, position.x, position.y);
  }
}
```

### 3. Add Entity Constant

Edit `packages/game-shared/src/constants/index.ts`:

Add to the `Entities` object:
```typescript
export const Entities = {
  // ... existing entities ...
  [ITEM_CONSTANT]: "[item_id]",
} as const;
```

### 4. Add Item Configuration

Edit `packages/game-shared/src/entities/item-configs.ts`:

Add to the `ITEM_CONFIGS` object:
```typescript
export const ITEM_CONFIGS: Record<string, ItemConfig> = {
  // ... existing items ...
  [item_id]: {
    id: "[item_id]",
    category: "consumable", // or appropriate category
    assets: {
      assetKey: "[item_id]",
      x: 0, // sprite sheet x coordinate
      y: 0, // sprite sheet y coordinate
      sheet: "items", // sprite sheet name
    },
    hideWhenSelected: true, // Optional: if true, don't render overlay when item is selected/equipped
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

### 5. Add to Item Types

Edit `packages/game-shared/src/util/inventory.ts`:

Add to the `ITEM_TYPES` array:
```typescript
export const ITEM_TYPES = [
  // ... existing items ...
  "[item_id]",
] as const;
```

### 6. Register in Server Entity Manager

Edit `packages/game-server/src/managers/entity-manager.ts`:

**a) Add import at the top:**
```typescript
import { [ItemName] } from "@/entities/items/[item-name]";
```

**b) Add to entityMap:**
```typescript
const entityMap = {
  // ... existing entities ...
  [Entities.[ITEM_CONSTANT]]: [ItemName],
};
```

**c) Register in registerDefaultItems():**
```typescript
private registerDefaultItems() {
  // ... existing registrations ...
  this.registerItem("[item_id]", [ItemName]);
}
```

### 7. Register in Client Entity Factory

Edit `packages/game-client/src/entities/entity-factory.ts`:

**a) Add import at the top:**
```typescript
import { [ItemName]Client } from "@/entities/items/[item-name]";
```

**b) Add to entityMap:**
```typescript
export const entityMap = {
  // ... existing entities ...
  [Entities.[ITEM_CONSTANT]]: [ItemName]Client,
  "[item_id]": [ItemName]Client, // Direct string key for runtime lookup (ensures it works even if constant doesn't resolve)
};
```

**Note:** Including both the computed property `[Entities.[ITEM_CONSTANT]]` and the direct string key `"[item_id]"` ensures the entity can be found at runtime. The direct string key acts as a fallback in case there are build/compilation issues with the constant resolution.

### 8. Update Player Lighting Logic

Edit `packages/game-server/src/entities/player.ts`:

Modify the `updateLighting()` method to check for your item in inventory:

```typescript
private updateLighting() {
  // Provide light if the player has a torch equipped or [item] in inventory
  const activeItem = this.activeItem;
  const hasTorchEquipped = activeItem?.itemType === "torch";
  const has[ItemName] = this.hasInInventory("[item_id]");

  if (this.hasExt(Illuminated)) {
    const illuminated = this.getExt(Illuminated);
    // Set radius to 200 if torch equipped or [item] in inventory, 0 otherwise
    illuminated.setRadius(hasTorchEquipped || has[ItemName] ? 200 : 0);
  }
}
```

**Key Points:**
- Use `this.hasInInventory("[item_id]")` to check if the item is in inventory
- The item does NOT need to be equipped (selected) to provide light
- Combine with other light sources using `||` operator

### 9. Add to Inventory Drop Table (Optional)

Edit `packages/game-server/src/extensions/inventory.ts`:

Add to the `ITEM_DROP_TABLE` array if you want the item to drop from enemies:

```typescript
const ITEM_DROP_TABLE: Array<{ itemType: ItemType; weight: number }> = [
  // ... existing items ...
  { itemType: "[item_id]", weight: 8 }, // Adjust weight as needed
];
```

**Weight Guidelines:**
- Higher weight = more common drop
- Common items: 10-25
- Uncommon items: 5-10
- Rare items: 1-5

### 10. Add to Map Spawn Table (Optional)

Edit `packages/game-server/src/managers/map-manager.ts`:

**a) Add spawn chance constant:**

Add to the `WEAPON_SPAWN_CHANCE` object:

```typescript
const WEAPON_SPAWN_CHANCE = {
  // ... existing items ...
  [ITEM_ID]: 0.0001, // Adjust spawn chance as needed (0.0 to 1.0)
} as const;
```

**b) Add to spawn table:**

Add to the `spawnTable` array:

```typescript
const spawnTable = [
  // ... existing items ...
  { chance: WEAPON_SPAWN_CHANCE.[ITEM_ID], ItemClass: [ItemName] },
];
```

**Spawn Chance Guidelines:**
- Very rare items: 0.0001 - 0.001 (miners-hat uses 0.0001)
- Rare items: 0.001 - 0.005
- Uncommon items: 0.005 - 0.01
- Common items: 0.01 - 0.1
- Very common items: 0.1 - 0.2

**Note:** The spawn chance is per valid ground tile during map generation. Lower values mean the item will spawn less frequently across the map.

**Example for miners-hat:**
```typescript
// In WEAPON_SPAWN_CHANCE object:
MINERS_HAT: 0.0001,

// In spawnTable array:
{ chance: WEAPON_SPAWN_CHANCE.MINERS_HAT, ItemClass: MinersHat },
```

**Important:** Don't forget to import the item class at the top of `map-manager.ts`:
```typescript
import { MinersHat } from "@/entities/items/miners-hat";
```

### 11. Add Sprite to Sprite Sheet

Add the item's sprite to the appropriate sprite sheet:
- Default location: `packages/website/public/tile-sheet.png`
- Items sheet: `packages/website/public/sheets/items-sheet.png`

Update the `x` and `y` coordinates in step 4 to match the sprite's position.

## Important Notes

### Placement Restrictions

Inventory light items should **NOT** be placeable. The miners-hat is correctly configured as `category: "consumable"` and is NOT included in the placement whitelist in:
- `packages/game-client/src/managers/placement.ts`
- `packages/game-server/src/managers/server-socket-manager.ts`

### Differences from Torch

| Feature | Torch | Miners-Hat (Inventory Light Item) |
|---------|-------|-----------------------------------|
| Must be equipped | ✅ Yes | ❌ No |
| Provides light when in inventory | ❌ No | ✅ Yes |
| Can be placed | ✅ Yes | ❌ No |
| Has Illuminated extension | ✅ Yes (on item) | ❌ No (on player) |
| Category | `"placeable"` | `"consumable"` |

### Testing Checklist

- [ ] Item can be picked up from the ground
- [ ] Item appears in inventory
- [ ] Player emits light when item is in inventory (even if not selected)
- [ ] Item cannot be placed as a structure
- [ ] Item sprite renders correctly
- [ ] Item overlay renders on player when in inventory (if applicable)
- [ ] Item overlay always shows when in inventory (regardless of selection)
- [ ] Item does NOT show as "held item" when selected (if `hideWhenSelected: true` is set)
- [ ] Item can be dropped from inventory
- [ ] Light turns off when item is removed from inventory
- [ ] Item spawns on map (if added to map spawn table)

## Example: Miners-Hat Implementation

The miners-hat serves as a complete reference implementation. Key files:

- Server entity: `packages/game-server/src/entities/items/miners-hat.ts`
- Client entity: `packages/game-client/src/entities/items/miners-hat.ts`
- Player lighting: `packages/game-server/src/entities/player.ts` (lines 630-641)
- Player overlay rendering: `packages/game-client/src/entities/player.ts` (renderMinersHat method)
- Item config: `packages/game-shared/src/entities/item-configs.ts` (includes `hideWhenSelected: true`)
- Map spawn: `packages/game-server/src/managers/map-manager.ts` (spawn chance: 0.0001)

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
- Ensure item ID is added to `ITEM_TYPES` in `inventory.ts`
- Verify entity constant matches in all files
- Check that imports use correct paths

### Entity not found at runtime ("Unknown entity type")
- Verify the entityMap includes both the computed property `[Entities.[CONSTANT]]` and direct string key `"[item_id]"`
- Ensure the client code has been rebuilt after adding the new entity
- Check that the entity constant is correctly exported from `@shared/constants`
- Verify the server is sending the correct entity type string (should match the item ID exactly)

