# Inventory System Documentation

## Overview

The inventory system is a core component that manages player items across both server and client. It uses an **Extension-based architecture** where the inventory is attached to entities (primarily players) as an extension, allowing for flexible item management, serialization, and synchronization.

## Architecture

### Core Components

The inventory system consists of three main components:

1. **Server Inventory Extension** (`packages/game-server/src/extensions/inventory.ts`)

   - Authoritative source of truth for inventory state
   - Handles item addition, removal, crafting, and state updates
   - Manages dirty tracking for efficient serialization

2. **Client Inventory Extension** (`packages/game-client/src/extensions/inventory.ts`)

   - Client-side representation of inventory
   - Receives updates from server via deserialization
   - Provides read-only access to inventory items for UI rendering

3. **Shared Inventory Types** (`packages/game-shared/src/util/inventory.ts`)
   - Common type definitions (`InventoryItem`, `ItemType`)
   - Utility functions (`isWeapon()`, `isResourceItem()`)
   - Shared constants and validation

### Extension System Integration

The inventory uses the game's Extension system, which allows entities to have composable behaviors:

```typescript
// Server-side
const inventory = player.getExt(Inventory);
inventory.addItem({ itemType: "pistol" });

// Client-side
const inventory = player.getExt(ClientInventory);
const items = inventory.getItems();
```

## Data Structures

### InventoryItem

```typescript
interface InventoryItem {
  itemType: ItemType; // String identifier (e.g., "pistol", "bandage")
  state?: ItemState; // Optional state (e.g., { count: 30 } for ammo)
}
```

### Inventory Storage

The inventory stores items as an **array** (`InventoryItem[]`), where:

- Array indices represent **slot positions** (0-indexed internally)
- Empty slots are represented as `null` or `undefined`
- The array can be **sparse** (gaps between items are allowed)
- Maximum slots are controlled by `getConfig().player.MAX_INVENTORY_SLOTS`

**Important**: Slot selection uses **1-indexed** values (1-10) for user-facing operations, but internally uses **0-indexed** arrays.

## Communication Flow

### Server → Client Synchronization

1. **Dirty Tracking**: When inventory changes, `markDirty()` is called

   ```typescript
   inventory.addItem({ itemType: "pistol" });
   inventory.markDirty(); // Marks extension as dirty
   ```

2. **Serialization**: During entity serialization, dirty extensions are serialized

   ```typescript
   // In Entity.serialize()
   if (ext.isDirty()) {
     return ext.serializeDirty() ?? ext.serialize();
   }
   ```

3. **Network Transmission**: Serialized inventory data is sent via `GAME_STATE_UPDATE` event

   ```typescript
   // Server sends full state or delta updates
   socket.emit(ServerSentEvents.GAME_STATE_UPDATE, {
     entities: [
       {
         id: "player-123",
         extensions: [
           {
             type: "inventory",
             items: [{ itemType: "pistol" }, null, { itemType: "bandage" }],
           },
         ],
       },
     ],
   });
   ```

4. **Client Deserialization**: Client receives and deserializes inventory data
   ```typescript
   // In ClientInventory.deserialize()
   if (data.items) {
     this.items = data.items; // Updates client inventory
   }
   ```

### Client → Server Communication

The client **never directly modifies** inventory. Instead:

1. **Input Events**: Client sends input (pickup, drop, craft) via socket events
2. **Server Processing**: Server processes input and modifies inventory
3. **State Sync**: Server sends updated inventory back to client

Example flow for picking up an item:

```
Client: Player walks near item → Server detects collision
Server: Carryable.pickup() → Inventory.addItem() → markDirty()
Server: Serializes inventory → Sends to client
Client: Receives update → Deserializes → UI updates
```

## Active Item System

### How Active Items Work

The active item is determined by the **selected inventory slot**:

1. **Input Selection**: Player selects slot via keyboard (1-9, 0) or mouse click

   ```typescript
   // In InputManager
   inputManager.setInventorySlot(1); // Selects slot 1 (1-indexed)
   ```

2. **Server Processing**: Input is sent to server with `inventoryItem` field

   ```typescript
   // In Player.setInput()
   this.input.inventoryItem = index; // 1-indexed slot number
   ```

3. **Active Item Retrieval**: Server/client retrieve active item from slot

   ```typescript
   // Server-side
   const activeItem = inventory.getActiveItem(this.input.inventoryItem);
   // input.inventoryItem is 1-indexed (1-10)
   // getActiveItem() converts to 0-indexed: items[index - 1]
   ```

4. **Weapon Detection**: Check if active item is a weapon
   ```typescript
   const activeWeapon = inventory.getActiveWeapon(activeItem);
   // Returns weapon if activeItem.itemType is in weaponRegistry
   ```

### Active Item Usage

**Combat (Weapons)**:

```typescript
// In Player.handleAttack()
const activeWeapon = this.getActiveWeapon();
if (activeWeapon) {
  const weaponEntity =
    this.getEntityManager().createEntityFromItem(activeWeapon);
  weaponEntity.attack(playerId, position, facing, aimAngle);
}
```

**Consumables**:

```typescript
// In Player.handleConsume()
const activeItem = this.activeItem;
if (activeItem && activeItem.itemType === "bandage") {
  // Consume logic
}
```

**Structures**:

```typescript
// In Player.handlePlaceStructure()
const activeItem = this.activeItem;
if (activeItem && activeItem.itemType === "wall") {
  // Place structure logic
}
```

## Item Types and Usage

### Weapons

**Identification**:

```typescript
import { isWeapon } from "@shared/util/inventory";

if (isWeapon(item.itemType)) {
  // Item is a weapon
}
```

**Weapon Registry**: Weapons are registered in `weaponRegistry` (`packages/game-shared/src/entities/weapon-registry.ts`)

**Usage Flow**:

1. Player selects weapon slot → `activeItem` becomes weapon
2. Player presses fire → `Player.handleAttack()` called
3. Weapon entity created → `createEntityFromItem(activeWeapon)`
4. Weapon attacks → Consumes ammo, creates projectiles
5. Ammo consumption → `consumeAmmo(inventory, ammoType)` finds and decrements ammo

**Ammo Consumption**:

```typescript
// In weapon attack methods (e.g., Pistol.attack())
const inventory = player.getExt(Inventory);
if (!consumeAmmo(inventory, "pistol_ammo")) {
  // No ammo available
  broadcastEvent(new GunEmptyEvent(playerId));
  return;
}
```

### Ammo

**Characteristics**:

- Ammo items have `category: "ammo"` in `ITEM_CONFIGS`
- Ammo uses **stackable state**: `{ count: number }`
- Ammo is consumed automatically when weapons fire
- Multiple ammo types: `pistol_ammo`, `shotgun_ammo`, `ak47_ammo`, etc.

**Finding Ammo**:

```typescript
// In consumeAmmo() helper
const ammoItem = inventory
  .getItems()
  .find((item) => item?.itemType === ammoType);
```

**Ammo Stacking**:

```typescript
// When picking up ammo, stacks merge
const existingAmmo = inventory
  .getItems()
  .find((item) => item?.itemType === "pistol_ammo");
if (existingAmmo) {
  inventory.updateItemState(index, {
    count: existingAmmo.state.count + newAmmoCount,
  });
}
```

### Consumables

**Examples**: Bandages, food, healing items

**Usage**:

```typescript
// In Player.handleConsume()
const activeItem = this.activeItem;
if (activeItem?.itemType === "bandage") {
  // Apply healing effect
  this.heal(amount);
  inventory.removeItem(slotIndex);
}
```

**Consumable Extension**: Some consumables use the `Consumable` extension for automatic behavior.

### Resources

**Identification**:

```typescript
import { isResourceItem } from "@shared/util/inventory";

if (isResourceItem(item.itemType)) {
  // Item is a resource (wood, cloth)
}
```

**Resource Storage**: Resources are stored separately in `ResourcesBag` extension, not in inventory.

**Resource Usage**: Resources are used for crafting recipes.

### Structures

**Examples**: Walls, spikes, sentry guns

**Placement**:

```typescript
// In Player.handlePlaceStructure()
const activeItem = this.activeItem;
if (activeItem && activeItem.itemType === "wall") {
  // Create structure entity at position
  // Remove item from inventory
  inventory.removeItem(slotIndex);
}
```

## Key Methods and Operations

### Server Inventory Methods

**Adding Items**:

```typescript
inventory.addItem({ itemType: "pistol" });
// Finds first empty slot or appends to end
// Automatically marks dirty
```

**Removing Items**:

```typescript
const item = inventory.removeItem(slotIndex);
// Sets slot to null (preserves array positions)
// Returns removed item or undefined
```

**Updating Item State**:

```typescript
inventory.updateItemState(slotIndex, { count: 30 });
// Updates state without removing item
// Useful for ammo, stackable items
```

**Checking Inventory**:

```typescript
inventory.isFull(); // Returns boolean
inventory.hasItem("pistol"); // Returns boolean
inventory.getItems(); // Returns InventoryItem[]
```

**Crafting**:

```typescript
const result = inventory.craftRecipe(recipeType, resources);
// Returns: { inventory, resources, itemToDrop? }
// Modifies inventory and resources
```

**Scattering Items** (on death):

```typescript
inventory.scatterItems(position);
// Creates entities for all items
// Scatters them around position
// Clears inventory
```

### Client Inventory Methods

**Reading Inventory**:

```typescript
const items = inventory.getItems(); // Read-only
const activeItem = inventory.getActiveItem(slotIndex);
const activeWeapon = inventory.getActiveWeapon(activeItem);
```

**Deserialization**:

```typescript
inventory.deserialize(extensionData);
// Called automatically when receiving server updates
```

## UI Integration

### Inventory Bar UI

**Location**: `packages/game-client/src/ui/inventory-bar.ts`

**Rendering**:

- Displays all inventory slots as a horizontal bar
- Shows item icons, counts, and slot numbers
- Highlights active slot
- Special styling for weapon slot (slot 0)

**Interaction**:

- Mouse clicks select slots
- Hover shows tooltips
- Slot 0 (weapon slot) has visual distinction

### Inventory Weapons UI

**Location**: `packages/game-client/src/ui/inventoryWeapons.ts`

**Purpose**: Radial weapon selection wheel (if implemented)

**Note**: Currently reads from full inventory, not separated weapons

## Modifying the System: Separating Weapons and Ammo

To create a separate weapons HUD, you'll need to modify the inventory structure. Here's a comprehensive guide:

### Current Structure

Currently, all items (weapons, ammo, consumables, structures) are stored in a single `items` array.

### Proposed Structure

Separate weapons and ammo into dedicated fields:

```typescript
// Server Inventory
class Inventory {
  private items: InventoryItem[] = []; // General items
  private weapons: InventoryItem[] = []; // Weapons only
  private ammo: InventoryItem[] = []; // Ammo only
}

// Client Inventory
class ClientInventory {
  private items: InventoryItem[] = [];
  private weapons: InventoryItem[] = [];
  private ammo: InventoryItem[] = [];
}
```

### Implementation Steps

#### 1. Update Type Definitions

**File**: `packages/game-shared/src/util/inventory.ts`

Add helper function to identify ammo:

```typescript
export function isAmmo(itemType: ItemType): boolean {
  // Check if itemType ends with "_ammo" or check item config
  return itemType.endsWith("_ammo");
  // OR: Check itemRegistry for category === "ammo"
}
```

#### 2. Modify Server Inventory

**File**: `packages/game-server/src/extensions/inventory.ts`

**Add separate arrays**:

```typescript
export default class Inventory implements Extension {
  private items: InventoryItem[] = [];
  private weapons: InventoryItem[] = [];
  private ammo: InventoryItem[] = [];

  // ... existing code ...
}
```

**Update `addItem()` method**:

```typescript
public addItem(item: InventoryItem): void {
  if (isWeapon(item.itemType)) {
    if (this.weapons.length >= MAX_WEAPON_SLOTS) return;
    this.weapons.push(item);
  } else if (isAmmo(item.itemType)) {
    // Try to stack with existing ammo
    const existingIndex = this.ammo.findIndex(
      (a) => a?.itemType === item.itemType
    );
    if (existingIndex >= 0) {
      // Merge stacks
      this.updateAmmoState(existingIndex, {
        count: (this.ammo[existingIndex].state?.count || 0) +
               (item.state?.count || 1)
      });
    } else {
      if (this.ammo.length >= MAX_AMMO_SLOTS) return;
      this.ammo.push(item);
    }
  } else {
    // Regular items
    if (this.isFull()) return;
    const emptySlotIndex = this.items.findIndex((it) => it == null);
    if (emptySlotIndex !== -1) {
      this.items[emptySlotIndex] = item;
    } else {
      this.items.push(item);
    }
  }

  this.markDirty();
}
```

**Update `getActiveWeapon()`**:

```typescript
public getActiveWeapon(weaponSlotIndex: number | null): InventoryItem | null {
  if (weaponSlotIndex === null) return null;
  return this.weapons[weaponSlotIndex] ?? null;
}
```

**Update `consumeAmmo()` helper**:

```typescript
// In packages/game-server/src/entities/weapons/helpers.ts
export function consumeAmmo(inventory: Inventory, ammoType: string): boolean {
  const ammoItem = inventory
    .getAmmo()
    .find((item) => item?.itemType === ammoType);
  // ... rest of logic
}
```

**Update serialization**:

```typescript
public serialize(): ExtensionSerialized {
  return {
    type: Inventory.type,
    items: this.items,
    weapons: this.weapons,
    ammo: this.ammo,
  };
}
```

#### 3. Modify Client Inventory

**File**: `packages/game-client/src/extensions/inventory.ts`

**Add separate arrays**:

```typescript
export class ClientInventory extends BaseClientExtension {
  private items: InventoryItem[] = [];
  private weapons: InventoryItem[] = [];
  private ammo: InventoryItem[] = [];

  public getWeapons(): InventoryItem[] {
    return this.weapons;
  }

  public getAmmo(): InventoryItem[] {
    return this.ammo;
  }

  public deserialize(data: ClientExtensionSerialized): this {
    if (data.items) this.items = data.items;
    if (data.weapons) this.weapons = data.weapons;
    if (data.ammo) this.ammo = data.ammo;
    return this;
  }
}
```

#### 4. Update UI Components

**Inventory Bar** (`packages/game-client/src/ui/inventory-bar.ts`):

- Continue displaying `items` array for general items
- Remove weapon slot from general inventory

**Weapons HUD** (new component):

- Create `weapons-hud.ts` component
- Display `weapons` array
- Display `ammo` array separately
- Show ammo counts next to corresponding weapons

**Example Weapons HUD**:

```typescript
export class WeaponsHUD implements Renderable {
  private getWeapons: () => InventoryItem[];
  private getAmmo: () => InventoryItem[];

  render(ctx: CanvasRenderingContext2D, gameState: GameState) {
    const weapons = this.getWeapons();
    const ammo = this.getAmmo();

    // Render weapons horizontally
    weapons.forEach((weapon, index) => {
      // Render weapon icon
      // Find corresponding ammo
      const weaponAmmoType = getWeaponAmmoType(weapon.itemType);
      const ammoItem = ammo.find((a) => a.itemType === weaponAmmoType);
      // Render ammo count next to weapon
    });
  }
}
```

#### 5. Update Active Item System

**Server** (`packages/game-server/src/entities/player.ts`):

```typescript
get activeWeapon(): InventoryItem | null {
  const inventory = this.getExt(Inventory);
  return inventory.getActiveWeapon(this.input.weaponSlot);
}

get activeItem(): InventoryItem | null {
  const inventory = this.getExt(Inventory);
  return inventory.getActiveItem(this.input.inventoryItem);
}
```

**Client** (`packages/game-client/src/entities/player.ts`):

```typescript
private updateActiveItemFromInventory() {
  const inventory = this.getExt(ClientInventory);

  // Update active weapon from weapons array
  this.activeWeapon = inventory.getActiveWeapon(this.input.weaponSlot);

  // Update active item from general items
  this.activeItem = inventory.getActiveItem(this.input.inventoryItem);
}
```

#### 6. Update Input System

**File**: `packages/game-client/src/managers/input.ts`

Add separate weapon slot selection:

```typescript
interface Input {
  inventoryItem: number | null; // General items (1-8)
  weaponSlot: number | null; // Weapons (0-4)
}
```

#### 7. Update Crafting System

**File**: `packages/game-server/src/extensions/inventory.ts`

Update `craftRecipe()` to handle weapons/ammo separately:

```typescript
public craftRecipe(recipe: RecipeType, resources: PlayerResources) {
  // ... existing logic ...

  // When adding crafted item, use addItem() which routes to correct array
  const result = foundRecipe.craft(this.items, this.weapons, this.ammo, resources);

  return result;
}
```

### Migration Considerations

1. **Backward Compatibility**: Handle old serialized data that only has `items` array
2. **Existing Items**: On load, migrate existing weapons/ammo from `items` to separate arrays
3. **Drop Logic**: Update `scatterItems()` to scatter from all three arrays
4. **Pickup Logic**: Update `Carryable.pickup()` to route to correct array

### Testing Checklist

- [ ] Weapons appear in weapons HUD
- [ ] Ammo appears in ammo display
- [ ] Weapon selection works
- [ ] Ammo consumption works
- [ ] Crafting creates items in correct arrays
- [ ] Picking up items routes correctly
- [ ] Dropping items works from all arrays
- [ ] Death scattering works
- [ ] Serialization/deserialization works
- [ ] UI updates correctly

## Common Patterns and Best Practices

### Checking Item Types

```typescript
import { isWeapon, isResourceItem } from "@shared/util/inventory";

if (isWeapon(item.itemType)) {
  // Handle weapon
} else if (isResourceItem(item.itemType)) {
  // Handle resource
} else if (item.itemType.endsWith("_ammo")) {
  // Handle ammo
}
```

### Iterating Over Inventory

```typescript
// Server-side
const inventory = player.getExt(Inventory);
const items = inventory.getItems();

items.forEach((item, index) => {
  if (item == null) return; // Skip empty slots
  // Process item
});
```

### Finding Specific Items

```typescript
// Find first weapon
const weapon = inventory
  .getItems()
  .find((item) => item && isWeapon(item.itemType));

// Find specific ammo type
const ammo = inventory
  .getItems()
  .find((item) => item?.itemType === "pistol_ammo");
```

### Updating Stackable Items

```typescript
// Update ammo count
const ammoIndex = inventory
  .getItems()
  .findIndex((item) => item?.itemType === "pistol_ammo");
if (ammoIndex >= 0) {
  const currentCount = inventory.getItems()[ammoIndex].state?.count || 0;
  inventory.updateItemState(ammoIndex, { count: currentCount + 10 });
}
```

## Troubleshooting

### Items Not Appearing

1. Check if inventory is full: `inventory.isFull()`
2. Verify item was added: `inventory.hasItem(itemType)`
3. Check serialization: Ensure `markDirty()` was called
4. Verify client deserialization: Check `ClientInventory.deserialize()`

### Active Item Not Updating

1. Verify input is being sent: Check `InputManager.setInventorySlot()`
2. Check server input processing: `Player.setInput()`
3. Verify slot index conversion: Remember 1-indexed → 0-indexed conversion

### Ammo Not Consuming

1. Check ammo exists: `inventory.hasItem(ammoType)`
2. Verify ammo count: `item.state?.count > 0`
3. Check `consumeAmmo()` logic: Ensure it finds and updates ammo

### Serialization Issues

1. Ensure `markDirty()` is called after changes
2. Check extension type matches: `Inventory.type === "inventory"`
3. Verify serialization format: `{ type, items }`

## Related Documentation

- [Serialization Pattern](./serialization.md) - How extensions serialize
- [Entity System](./entity-system-diagram.md) - Extension system overview
- [Adding Weapons](./adding-weapons.md) - How to add new weapons
- [Adding Items](./adding-inventory-light-items.md) - How to add inventory items
