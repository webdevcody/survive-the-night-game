# Extension Field-Level Delta Compression Analysis

## Zombie Entity Extension Breakdown

### Current Serialization (All Fields Always Sent)

| Extension | Fields | Bytes per Field | Total Bytes | Change Frequency |
|----------|--------|-----------------|-------------|------------------|
| **Positionable** | Extension ID (1) + position (4) + size (2) | 1 + 4 + 2 | **7 bytes** | position: every frame when moving<br>size: never (set once) |
| **Movable** | Extension ID (1) + velocity (4) | 1 + 4 | **5 bytes** | velocity: every frame when moving<br>or when friction applies |
| **Destructible** | Extension ID (1) + health (8) + maxHealth (8) | 1 + 8 + 8 | **17 bytes** | health: only when damaged<br>maxHealth: never (set once) |
| **Collidable** | Extension ID (1) + offset (16) + size (16) + enabled (1) | 1 + 16 + 16 + 1 | **34 bytes** | offset: never<br>size: never<br>enabled: only when zombie dies |
| **Groupable** | Extension ID (1) + group string (9) | 1 + 9 | **10 bytes** | group: never (set once) |
| **Inventory** | Extension ID (1) + items array (~15-25) | 1 + ~20 | **~21 bytes** | items: never (set at spawn) |
| **TOTAL** | | | **~94 bytes** | |

### Field-Level Breakdown

#### Positionable Extension (7 bytes total)
- Extension type ID: **1 byte** (always needed to identify extension)
- position (Position2): **4 bytes** (2 Int16) - changes frequently
- size (Size2): **2 bytes** (2 UInt8) - changes never

#### Movable Extension (5 bytes total)
- Extension type ID: **1 byte** (always needed)
- velocity (Velocity2): **4 bytes** (2 Int16) - changes frequently

#### Destructible Extension (17 bytes total)
- Extension type ID: **1 byte** (always needed)
- health: **8 bytes** (Float64) - changes rarely (only when damaged)
- maxHealth: **8 bytes** (Float64) - changes never

#### Collidable Extension (34 bytes total)
- Extension type ID: **1 byte** (always needed)
- offset (Vector2): **16 bytes** (2 Float64) - changes never
- size (Vector2): **16 bytes** (2 Float64) - changes never
- enabled (Boolean): **1 byte** - changes rarely (only when zombie dies)

#### Groupable Extension (10 bytes total)
- Extension type ID: **1 byte** (always needed)
- group (String): **9 bytes** (4 length + 5 "enemy") - changes never

#### Inventory Extension (~21 bytes total)
- Extension type ID: **1 byte** (always needed)
- items array: **~20 bytes** (4 count + items) - changes never

## Potential Savings Scenarios

### Scenario 1: Moving Zombie (Most Common)
**Current**: All dirty extensions serialized with all fields = ~94 bytes
**With Field-Level Delta**: Only changed fields within dirty extensions

**Typical Update Pattern:**
- Positionable: dirty (position changed, size unchanged)
  - Current: 7 bytes
  - With delta: 1 (extension ID) + 4 (position) = **5 bytes** ✅ **Save 2 bytes**
- Movable: dirty (velocity changed)
  - Current: 5 bytes
  - With delta: 1 (extension ID) + 4 (velocity) = **5 bytes** (no change)
- Destructible: not dirty (health unchanged)
  - Current: 0 bytes (extension not sent)
  - With delta: 0 bytes (no change)
- Collidable: not dirty
  - Current: 0 bytes
  - With delta: 0 bytes (no change)
- Groupable: not dirty
  - Current: 0 bytes
  - With delta: 0 bytes (no change)
- Inventory: not dirty
  - Current: 0 bytes
  - With delta: 0 bytes (no change)

**Total**: Current = 12 bytes, With delta = 10 bytes
**Savings**: **2 bytes (16.7% reduction)** per update

### Scenario 2: Idle Zombie (No Movement)
**Typical Update Pattern:**
- Positionable: not dirty (position unchanged)
  - Current: 0 bytes
  - With delta: 0 bytes (no change)
- Movable: dirty (velocity changed due to friction, but may be near-zero)
  - Current: 5 bytes
  - With delta: 1 (extension ID) + 4 (velocity) = **5 bytes** (no change)
- Destructible: not dirty
  - Current: 0 bytes
  - With delta: 0 bytes (no change)
- Other extensions: not dirty
  - Current: 0 bytes
  - With delta: 0 bytes (no change)

**Total**: Current = 5 bytes, With delta = 5 bytes
**Savings**: **0 bytes** (no change for idle zombies)

### Scenario 3: Zombie Takes Damage
**Typical Update Pattern:**
- Positionable: dirty (position changed)
  - Current: 7 bytes
  - With delta: 1 + 4 = **5 bytes** ✅ **Save 2 bytes**
- Movable: dirty (velocity changed)
  - Current: 5 bytes
  - With delta: 5 bytes (no change)
- Destructible: dirty (health changed, maxHealth unchanged)
  - Current: 17 bytes
  - With delta: 1 (extension ID) + 8 (health) = **9 bytes** ✅ **Save 8 bytes**
- Other extensions: not dirty
  - Current: 0 bytes
  - With delta: 0 bytes (no change)

**Total**: Current = 29 bytes, With delta = 19 bytes
**Savings**: **10 bytes (34.5% reduction)** per damage update

### Scenario 4: Zombie Dies
**Typical Update Pattern:**
- Positionable: dirty (position changed)
  - Current: 7 bytes
  - With delta: 1 + 4 = **5 bytes** ✅ **Save 2 bytes**
- Movable: dirty (velocity changed)
  - Current: 5 bytes
  - With delta: 5 bytes (no change)
- Destructible: dirty (health = 0, maxHealth unchanged)
  - Current: 17 bytes
  - With delta: 1 + 8 = **9 bytes** ✅ **Save 8 bytes**
- Collidable: dirty (enabled = false, offset/size unchanged)
  - Current: 34 bytes
  - With delta: 1 (extension ID) + 1 (enabled) = **2 bytes** ✅ **Save 32 bytes**
- Groupable: not dirty
  - Current: 0 bytes
  - With delta: 0 bytes (no change)
- Inventory: not dirty
  - Current: 0 bytes
  - With delta: 0 bytes (no change)

**Total**: Current = 63 bytes, With delta = 21 bytes
**Savings**: **42 bytes (66.7% reduction)** on death update

## Summary Statistics

### Average Savings Per Update (Estimated)

Assuming a typical zombie lifecycle:
- **70%** of updates: Moving (Scenario 1) → Save 2 bytes
- **20%** of updates: Idle (Scenario 2) → Save 0 bytes
- **8%** of updates: Taking damage (Scenario 3) → Save 10 bytes
- **2%** of updates: Dying (Scenario 4) → Save 42 bytes

**Weighted Average Savings:**
```
(0.70 × 2) + (0.20 × 0) + (0.08 × 10) + (0.02 × 42)
= 1.4 + 0 + 0.8 + 0.84
= 3.04 bytes per update
```

**Percentage Reduction:**
- Average update size (current): ~12-15 bytes (most updates are movement)
- Average update size (with delta): ~9-12 bytes
- **Average reduction: ~20-25% per update**

### Annualized Savings (Example)

For a server with:
- 100 zombies active
- 30 updates per second per zombie
- 8 hours of gameplay per day

**Current bandwidth per zombie**: ~12 bytes × 30 updates/sec = 360 bytes/sec
**With field-level delta**: ~9 bytes × 30 updates/sec = 270 bytes/sec
**Savings per zombie**: 90 bytes/sec = 0.09 KB/sec

**For 100 zombies**: 9 KB/sec = 32.4 MB/hour = 777.6 MB/day

**Annual savings**: ~284 GB/year per 100 concurrent zombies

## Implementation Considerations

### Overhead Costs
1. **Field tracking**: Need to track which fields are dirty within each extension
   - Already tracked via `SerializableFields.getDirtyFields()`
   - Minimal overhead: Set operations

2. **Serialization complexity**: Need to write field count + field names
   - For Positionable: Would need 1 byte (field count) + 1 byte (field name length) + 6 bytes ("position") = 8 bytes overhead
   - This overhead might negate savings for small extensions!

3. **Deserialization complexity**: Need to read field names and selectively update
   - More complex client-side code
   - Need to handle missing fields gracefully

### Break-Even Analysis

**Positionable Extension:**
- Current: 7 bytes (all fields)
- With delta (position only): 1 (ext ID) + 1 (field count) + 1 (name length) + 6 ("position") + 4 (value) = **13 bytes**
- **Overhead exceeds savings!** ❌

**Destructible Extension:**
- Current: 17 bytes (all fields)
- With delta (health only): 1 (ext ID) + 1 (field count) + 1 (name length) + 6 ("health") + 8 (value) = **17 bytes**
- **Break-even** ⚠️

**Collidable Extension:**
- Current: 34 bytes (all fields)
- With delta (enabled only): 1 (ext ID) + 1 (field count) + 1 (name length) + 7 ("enabled") + 1 (value) = **11 bytes**
- **Saves 23 bytes** ✅

### Optimized Approach: Field Index Encoding

Instead of field names (expensive), use field indices:
- Positionable: position = 0, size = 1
- Destructible: health = 0, maxHealth = 1
- Collidable: offset = 0, size = 1, enabled = 2

**Positionable with index encoding:**
- Current: 7 bytes
- With delta (position only): 1 (ext ID) + 1 (field count) + 1 (field index) + 4 (value) = **7 bytes**
- **Break-even** ⚠️

**Destructible with index encoding:**
- Current: 17 bytes
- With delta (health only): 1 (ext ID) + 1 (field count) + 1 (field index) + 8 (value) = **11 bytes**
- **Saves 6 bytes** ✅

**Collidable with index encoding:**
- Current: 34 bytes
- With delta (enabled only): 1 (ext ID) + 1 (field count) + 1 (field index) + 1 (value) = **4 bytes**
- **Saves 30 bytes** ✅

## Final Recommendation

**Field-level delta compression is beneficial for:**
1. ✅ **Collidable extension** - Large fields (32 bytes) that rarely change
2. ✅ **Destructible extension** - maxHealth never changes (8 bytes saved)
3. ⚠️ **Positionable extension** - Small fields, overhead may negate savings
4. ⚠️ **Movable extension** - Only one field, no benefit

**Estimated Net Savings with Index Encoding:**
- Moving zombie: ~2-3 bytes saved (from Destructible.maxHealth when health changes)
- Dying zombie: ~38 bytes saved (from Collidable + Destructible)
- **Average: ~3-5 bytes per update (20-30% reduction)**

**Conclusion**: Field-level delta compression would provide modest but meaningful bandwidth savings, especially for entities with large, rarely-changing fields like Collidable. The implementation complexity may not be worth it for small extensions, but could be valuable for larger, more complex entities.

