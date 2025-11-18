# Field Delta Compression vs Extension Compression Cost Analysis

## Current Implementation: Field Delta Compression

### Format Structure
For each extension with changed fields:
```
[Extension Type ID: 1 byte (uint8)]
[Field Count: 1 byte (uint8)]
For each changed field:
  [Field ID: 1 byte (uint8)]
  [Field Value: variable bytes]
```

**Overhead per extension**: 2 bytes (extension type + field count)
**Overhead per field**: 1 byte (field ID)

### Field ID Overhead
- Field IDs are used to identify which field changed
- Field type is determined client-side via registry lookup (not sent over wire)
- Each changed field adds 1 byte overhead

---

## Alternative: Extension Compression (No Field Delta)

### Format Structure
For each extension with any changed field:
```
[Extension Type ID: 1 byte (uint8)]
[All Field Values: in order, no IDs]
```

**Overhead per extension**: 1 byte (extension type only)
**Overhead per field**: 0 bytes (fields sent in fixed order)

---

## Cost Comparison by Extension

### Positionable Extension
**Fields**: position (Position2 = 4 bytes), size (Size2 = 2 bytes)
**Total data**: 6 bytes

#### Field Delta Compression
- **Best case** (only position changes): 
  - Extension ID: 1 byte
  - Field count: 1 byte
  - Field ID (position): 1 byte
  - Position value: 4 bytes
  - **Total: 7 bytes**

- **Worst case** (both fields change):
  - Extension ID: 1 byte
  - Field count: 1 byte
  - Field ID (position): 1 byte
  - Position value: 4 bytes
  - Field ID (size): 1 byte
  - Size value: 2 bytes
  - **Total: 11 bytes**

#### Extension Compression
- **Any field changes** (always send all fields):
  - Extension ID: 1 byte
  - Position value: 4 bytes
  - Size value: 2 bytes
  - **Total: 7 bytes**

**Analysis**: 
- Field delta saves 0 bytes when only position changes (7 vs 7)
- Field delta costs 4 extra bytes when both change (11 vs 7)
- **Extension compression is better or equal** ✅

---

### Movable Extension
**Fields**: velocity (Velocity2 = 4 bytes)
**Total data**: 4 bytes

#### Field Delta Compression
- Extension ID: 1 byte
- Field count: 1 byte
- Field ID (velocity): 1 byte
- Velocity value: 4 bytes
- **Total: 7 bytes**

#### Extension Compression
- Extension ID: 1 byte
- Velocity value: 4 bytes
- **Total: 5 bytes**

**Analysis**: 
- Field delta adds 2 bytes overhead (7 vs 5)
- **Extension compression saves 2 bytes** ✅

---

### Destructible Extension
**Fields**: health (Float64 = 8 bytes), maxHealth (Float64 = 8 bytes)
**Total data**: 16 bytes

#### Field Delta Compression
- **Best case** (only health changes):
  - Extension ID: 1 byte
  - Field count: 1 byte
  - Field ID (health): 1 byte
  - Health value: 8 bytes
  - **Total: 11 bytes**

- **Worst case** (both fields change):
  - Extension ID: 1 byte
  - Field count: 1 byte
  - Field ID (health): 1 byte
  - Health value: 8 bytes
  - Field ID (maxHealth): 1 byte
  - MaxHealth value: 8 bytes
  - **Total: 20 bytes**

#### Extension Compression
- Extension ID: 1 byte
- Health value: 8 bytes
- MaxHealth value: 8 bytes
- **Total: 17 bytes**

**Analysis**:
- Field delta saves 6 bytes when only health changes (11 vs 17) ✅
- Field delta costs 3 extra bytes when both change (20 vs 17)
- **Field delta is better when only health changes** ✅

---

### Collidable Extension
**Fields**: offset (Vector2 = 16 bytes), size (Vector2 = 16 bytes), enabled (Boolean = 1 byte)
**Total data**: 33 bytes

#### Field Delta Compression
- **Best case** (only enabled changes):
  - Extension ID: 1 byte
  - Field count: 1 byte
  - Field ID (enabled): 1 byte
  - Enabled value: 1 byte
  - **Total: 4 bytes** ✅

- **Worst case** (all fields change):
  - Extension ID: 1 byte
  - Field count: 1 byte
  - Field ID (offset): 1 byte
  - Offset value: 16 bytes
  - Field ID (size): 1 byte
  - Size value: 16 bytes
  - Field ID (enabled): 1 byte
  - Enabled value: 1 byte
  - **Total: 38 bytes**

#### Extension Compression
- Extension ID: 1 byte
- Offset value: 16 bytes
- Size value: 16 bytes
- Enabled value: 1 byte
- **Total: 34 bytes**

**Analysis**:
- Field delta saves 30 bytes when only enabled changes (4 vs 34) ✅✅✅
- Field delta costs 4 extra bytes when all change (38 vs 34)
- **Field delta is MUCH better for rare field changes** ✅

---

## Real-World Update Patterns

### Scenario 1: Moving Zombie (Most Common - ~70% of updates)
**Dirty extensions**: Positionable (position), Movable (velocity)

#### Field Delta Compression
- Positionable: 1 + 1 + 1 + 4 = **7 bytes** (position only)
- Movable: 1 + 1 + 1 + 4 = **7 bytes** (velocity only)
- **Total: 14 bytes**

#### Extension Compression
- Positionable: 1 + 4 + 2 = **7 bytes** (all fields)
- Movable: 1 + 4 = **5 bytes** (all fields)
- **Total: 12 bytes**

**Savings with Extension Compression: 2 bytes (14.3% reduction)** ✅

---

### Scenario 2: Zombie Takes Damage (~8% of updates)
**Dirty extensions**: Positionable (position), Movable (velocity), Destructible (health)

#### Field Delta Compression
- Positionable: 1 + 1 + 1 + 4 = **7 bytes** (position only)
- Movable: 1 + 1 + 1 + 4 = **7 bytes** (velocity only)
- Destructible: 1 + 1 + 1 + 8 = **11 bytes** (health only)
- **Total: 25 bytes**

#### Extension Compression
- Positionable: 1 + 4 + 2 = **7 bytes** (all fields)
- Movable: 1 + 4 = **5 bytes** (all fields)
- Destructible: 1 + 8 + 8 = **17 bytes** (all fields)
- **Total: 29 bytes**

**Savings with Field Delta: 4 bytes (13.8% reduction)** ✅

---

### Scenario 3: Zombie Dies (~2% of updates)
**Dirty extensions**: Positionable (position), Movable (velocity), Destructible (health), Collidable (enabled)

#### Field Delta Compression
- Positionable: 1 + 1 + 1 + 4 = **7 bytes** (position only)
- Movable: 1 + 1 + 1 + 4 = **7 bytes** (velocity only)
- Destructible: 1 + 1 + 1 + 8 = **11 bytes** (health only)
- Collidable: 1 + 1 + 1 + 1 = **4 bytes** (enabled only)
- **Total: 29 bytes**

#### Extension Compression
- Positionable: 1 + 4 + 2 = **7 bytes** (all fields)
- Movable: 1 + 4 = **5 bytes** (all fields)
- Destructible: 1 + 8 + 8 = **17 bytes** (all fields)
- Collidable: 1 + 16 + 16 + 1 = **34 bytes** (all fields)
- **Total: 63 bytes**

**Savings with Field Delta: 34 bytes (54% reduction)** ✅✅✅

---

### Scenario 4: Idle Zombie (~20% of updates)
**Dirty extensions**: Movable (velocity from friction)

#### Field Delta Compression
- Movable: 1 + 1 + 1 + 4 = **7 bytes** (velocity only)
- **Total: 7 bytes**

#### Extension Compression
- Movable: 1 + 4 = **5 bytes** (all fields)
- **Total: 5 bytes**

**Savings with Extension Compression: 2 bytes (28.6% reduction)** ✅

---

## Weighted Average Analysis

### Update Frequency Distribution
- Moving: 70% of updates
- Idle: 20% of updates
- Taking damage: 8% of updates
- Dying: 2% of updates

### Field Delta Compression Average
```
(0.70 × 14) + (0.20 × 7) + (0.08 × 25) + (0.02 × 29)
= 9.8 + 1.4 + 2.0 + 0.58
= 13.78 bytes per update
```

### Extension Compression Average
```
(0.70 × 12) + (0.20 × 5) + (0.08 × 29) + (0.02 × 63)
= 8.4 + 1.0 + 2.32 + 1.26
= 12.98 bytes per update
```

**Average difference: 0.8 bytes per update (6.2% more with field delta)**

---

## Key Insights

### When Field Delta Wins
1. **Collidable extension** - Saves 30 bytes when only `enabled` changes (zombie death)
2. **Destructible extension** - Saves 6 bytes when only `health` changes (damage)
3. **Large extensions with rarely-changing fields** - Significant savings

### When Extension Compression Wins
1. **Positionable extension** - Saves 0-4 bytes (no overhead)
2. **Movable extension** - Saves 2 bytes (single field, no benefit from delta)
3. **Small extensions** - Overhead (field count + field IDs) exceeds savings
4. **Most common updates** - Moving zombies benefit more from extension compression

### The Overhead Problem
Field delta compression adds:
- **2 bytes per extension** (extension type + field count)
- **1 byte per changed field** (field ID)

For small extensions like Movable (1 field) or Positionable (2 fields), this overhead often negates or exceeds potential savings.

---

## Recommendation

### Option 1: Extension Compression (Simpler, Better for Common Cases)
**Pros:**
- Simpler implementation (no field tracking needed)
- Better for most common updates (moving zombies)
- No overhead for field IDs/counts
- Easier to maintain and debug

**Cons:**
- Sends unchanged fields (but they're small for Positionable/Movable)
- Misses savings on rare events (zombie death)

**Best for**: High-frequency updates with small extensions

---

### Option 2: Hybrid Approach (Best of Both Worlds)
Use extension compression for small extensions, field delta for large ones:

- **Positionable** (2 fields, 6 bytes): Extension compression
- **Movable** (1 field, 4 bytes): Extension compression
- **Destructible** (2 fields, 16 bytes): Field delta compression
- **Collidable** (3 fields, 33 bytes): Field delta compression

**Implementation**: Add a flag to extension config indicating compression strategy.

**Estimated savings**: 
- Common updates: Same as extension compression (12 bytes)
- Rare updates: Same as field delta (29 bytes)
- **Best overall performance** ✅

---

### Option 3: Keep Field Delta (Current)
**Pros:**
- Maximum savings on rare events (zombie death: 34 bytes saved)
- Consistent approach across all extensions

**Cons:**
- Overhead hurts common updates (moving zombies: 2 bytes worse)
- More complex implementation
- Slightly worse average performance

**Best for**: When rare events (deaths) are bandwidth-critical

---

## Conclusion

**For your use case** (Positionable and Movable update most frequently):

1. **Extension compression is better** for the common case (moving zombies)
2. **Field delta is better** for rare cases (zombie death)
3. **Hybrid approach** gives best overall performance

**Recommendation**: Switch to **Extension Compression** for Positionable and Movable, keep field delta for Destructible and Collidable (or switch all to extension compression for simplicity).

The overhead of field delta compression (field count + field IDs) is too high for small, frequently-updating extensions. The 2-3 bytes saved on rare events doesn't justify the 2 bytes lost on every common update.

