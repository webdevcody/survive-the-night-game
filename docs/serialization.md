# Entity Serialization Pattern

## Overview

Entities in the game use a type-safe serialization pattern to efficiently sync state between server and client. Only fields that change need to be transmitted over the network, using a "dirty tracking" system.

## Core Pattern

### 1. Define Serializable Fields

Each entity class defines a `const` array of field names that should be serialized:

```typescript
const SERIALIZABLE_FIELDS = ["fieldName1", "fieldName2", "fieldName3"] as const;
```

The `as const` assertion creates a readonly tuple type, enabling TypeScript to infer exact field names.

### 2. Extend Entity with Field Types

The entity class extends `Entity` with the serializable fields type:

```typescript
export class MyEntity extends Entity<typeof SERIALIZABLE_FIELDS> {
  protected serializableFields = SERIALIZABLE_FIELDS;
  // ...
}
```

### 3. Declare Private Fields

Fields are declared as private class properties. Only fields listed in `SERIALIZABLE_FIELDS` will be included in serialization:

```typescript
private health: number = 100;
private isActive: boolean = false;
private displayName: string = "";
```

## Examples

### Player Entity (packages/game-server/src/entities/player.ts)

```typescript
// Define which fields to serialize
const PLAYER_SERIALIZABLE_FIELDS = [
  "isCrafting",
  "skin",
  "kills",
  "ping",
  "displayName",
  "stamina",
  "maxStamina",
  "input",
  "activeItem",
  "inventory",
] as const;

export class Player extends Entity<typeof PLAYER_SERIALIZABLE_FIELDS> {
  protected serializableFields = PLAYER_SERIALIZABLE_FIELDS;

  // Serializable fields (accessible via base class serialization)
  private isCrafting = false;
  private skin: SkinType = SKIN_TYPES.DEFAULT;
  private kills: number = 0;
  private ping: number = 0;
  private displayName: string = "";
  private stamina: number = getConfig().player.MAX_STAMINA;
  private maxStamina: number = getConfig().player.MAX_STAMINA;
  private input: Input = { /* ... */ };

  // Non-serializable fields (internal state only)
  private fireCooldown = new Cooldown(0.4, true);
  private dropCooldown = new Cooldown(Player.DROP_COOLDOWN, true);
  private interactCooldown = new Cooldown(Player.INTERACT_COOLDOWN, true);
  private lastWeaponType: ItemType | null = null;
  private exhaustionTimer: number = 0;
  // ...
}
```

### Survivor Entity (packages/game-server/src/entities/environment/survivor.ts)

```typescript
const SERIALIZABLE_FIELDS = ["isRescued"] as const;

export class Survivor extends Entity<typeof SERIALIZABLE_FIELDS> {
  protected serializableFields = SERIALIZABLE_FIELDS;

  // Serializable field
  private isRescued: boolean = false;

  // Internal state fields (not serialized)
  private fireCooldown: Cooldown;
  private wanderTimer: number = 0;
  private wanderDirection: Vector2 | null = null;
  private isWandering: boolean = false;
  private campsiteCenter: Vector2 | null = null;
  private initialSpawnPosition: Vector2 | null = null;
  // ...
}
```

## Dirty Tracking

To minimize network bandwidth, the serialization system tracks which fields have changed:

### Marking Fields Dirty

When a serializable field changes, mark it as dirty:

```typescript
this.stamina = newValue;
this.markFieldDirty("stamina");
```

### Serialization Methods

```typescript
// Serialize all fields
const fullState = entity.serialize(false);

// Serialize only dirty fields (for efficient updates)
const deltaState = entity.serialize(true);
```

## Key Benefits

1. **Type Safety**: TypeScript validates that only declared fields can be marked dirty
2. **Performance**: Only changed fields are transmitted over the network
3. **Separation of Concerns**: Clear distinction between serializable state and internal implementation details
4. **Flexibility**: Each entity controls exactly what state is synchronized

## Guidelines

### What to Serialize

- Player-visible state (health, position, inventory)
- State needed for client rendering (animations, facing direction)
- State needed for client prediction (input, velocity)
- Game-critical state (crafting status, rescue status)

### What NOT to Serialize

- Cooldown timers (server-authoritative)
- AI state (pathfinding, decision making)
- Temporary calculation values
- Internal optimization data structures
- Network connection state

### Naming Convention

- Use descriptive names that indicate the field's purpose
- Boolean flags typically start with "is" or "has" (e.g., `isRescued`, `isCrafting`)
- Avoid abbreviations unless universally understood
- Keep field names consistent across similar entities

## Common Patterns

### Computed Properties

For fields derived from other state, use getters instead of serializing:

```typescript
// Don't serialize activeItem directly if it's computed
get activeItem(): InventoryItem | null {
  return this.getExt(Inventory).getActiveItem(this.input.inventoryItem);
}
```

### Conditional Serialization

The base `Entity` class can access serializable fields directly via TypeScript's type system, allowing for efficient delta updates:

```typescript
// In Entity base class
serialize(onlyDirty: boolean = false): RawEntity {
  if (onlyDirty) {
    // Only include dirty fields
  } else {
    // Include all serializable fields
  }
}
```

### Extension-Based State

Many entity properties come from Extensions (like Positionable, Destructible, Inventory). These are serialized separately by the extension system, so don't duplicate them in entity-level serialization.

Example - Player position is NOT in serializable fields because `Positionable` extension handles it:

```typescript
// Don't do this:
const FIELDS = ["x", "y", "health"] as const;

// Do this instead - let extensions handle their own state:
const FIELDS = ["isCrafting", "displayName"] as const;
// Position comes from Positionable extension
// Health comes from Destructible extension
```
