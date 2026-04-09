# Character stats overhaul (expanded)

## Goals

- Rename **defence** → **evade**: chance to **fully avoid** damage from **zombie** hits (not flat mitigation).
- **Health**: **+1 max HP per allocated point** (replace current +4/point).
- **Accuracy**: keep **random angular spread** on shots; ensure higher accuracy **meaningfully** tightens spread (all relevant firearms, not only pistol where applicable).
- Add **stamina** stat: increases **max stamina** (derived from base config + points).
- Add **recovery** stat: increases **stamina regeneration rate** (and/or effectiveness of `STAMINA_REGEN_RATE`).
- Add **HP recovery** stat: drives **new passive HP regen** — small heals on an interval; **higher stat reduces time between heals** (passive regen, distinct from the existing Regenerate skill unless we intentionally merge later).
- Add **strength** stat: increases **inventory capacity** (slots or effective capacity — see implementation note).
- **Item weight**: default **0.1 kg** per item type; **total carried weight** increases **stamina drain** while moving/sprinting (tunable curve).

## Architecture: shared formulas

Centralize derived values in [`packages/game-shared/src/util/character-stats.ts`](packages/game-shared/src/util/character-stats.ts) (or a sibling module) as **pure functions** taking base config + allocated points, e.g.:

- `computeMaxHealth(baseMax, healthPoints)`
- `computeEvadeChance(evadePoints)` — cap e.g. 50–75% to avoid invincibility
- `computeMaxStamina(baseMax, staminaPoints)`
- `computeStaminaRegenMultiplier(recoveryPoints)`
- `computePassiveHpRegenIntervalSeconds(hpRecoveryPoints)` — interval decreases with points
- `computeInventorySlotBonus(strengthPoints)` or `computeMaxInventorySlots(...)`
- `getCarriedWeightKg(items)` using `itemRegistry` + default weight **0.1** when unspecified
- `computeEncumbranceStaminaDrainMultiplier(totalWeightKg)` — multiply sprint drain (and optionally base move cost)

Server [`Player`](packages/game-server/src/entities/players/player.ts) applies these in one place (e.g. `applyDerivedStatsFromAllocations` + update loop), matching the earlier “base + allocation” approach.

## Server implementation notes

### Evade (zombie hits only)

Today [`Destructible.damage`](packages/game-server/src/extensions/destructible.ts) calls `onBeforeDamage(damage)` **without** `attackerId`, so mitigation cannot distinguish zombie vs player.

- **Change** `DestructibleBeforeDamageHandler` to `(damage: number, attackerId?: number) => number` and pass `attackerId` from `damage()`. Only [`Player`](packages/game-server/src/entities/players/player.ts) registers `onBeforeDamage` today; update that callback.
- In the player callback: if `attackerId` refers to an entity that is a **zombie** (type check via entity manager), roll evade: with probability `computeEvadeChance(statEvade)` return **0**, else return full `damage`. Non-zombie damage unchanged.

Rename serialized field **`statDefence` → `statEvade`** (uint8) and update buffer/serialization metadata; migrate client mirror fields (`statDefence` → `statEvade`).

### Health

- Set modifier to **+1 max HP per point**; refactor server to use shared `computeMaxHealth`.

### Accuracy / spread

- [`Pistol`](packages/game-server/src/entities/weapons/pistol.ts) already applies `getAccuracySpreadMultiplier()` and jitter. **Audit** other projectile weapons (rifle, shotgun, etc.) and apply the same pattern: **base spread × multiplier**, plus random angle offset so **higher accuracy = smaller deviation**.

### Stamina + recovery

- **Max stamina**: after computing max, set `serialized` `maxStamina` and clamp current `stamina` ≤ max (same pattern as health).
- **Recovery**: scale effective regen using `STAMINA_REGEN_RATE` × multiplier from **recovery** points. Ensure exhaustion / sprint drain in `handleMovement` still behave sensibly.

### Passive HP regen (HP recovery stat)

- Add fields: e.g. `lastPassiveHealTime` or accumulate delta until interval elapses.
- On tick: if alive and `currentHealth < maxHealth`, heal a **small fixed amount** (config constant) every `intervalSeconds(stat)` from shared helper.
- Tune so it does not obsolete the **Regenerate** skill unless intended; document relationship in code comments.

### Strength + inventory

- [`Inventory.isFull`](packages/game-server/src/extensions/inventory.ts) and related logic use `getConfig().player.MAX_INVENTORY_SLOTS`. **Change** to `player.getMaxInventorySlots()` (or pass cap from player) so **strength** increases slot count (e.g. `base + floor(strength * k)` with cap if needed).
- Client must use the same cap for UI if it mirrors slot limits.

### Encumbrance (weight)

- Add **`weightKg`** to [`ItemConfig`](packages/game-shared/src/entities/item-registry.ts) (optional); **`getItemWeightKg(id)`** returns `config.weightKg ?? 0.1`.
- Sum weight across bag **and** equipment if items exist in both (follow how inventory counts items).
- In **stamina drain** path (sprint), multiply drain by `f(encumbrance)` so heavier load burns stamina faster.

## Persistence and renames

- [`CHARACTER_STAT_KEYS`](packages/game-shared/src/util/character-stats.ts): replace `defence` with `evade`; add `stamina`, `recovery`, `hpRecovery`, `strength`.
- [`normalizeCharacterAllocations`](packages/game-shared/src/util/progression-allocation.ts): accept legacy key **`defence`** and map to **`evade`** once when normalizing (optional migration in memory).
- **Website / DB**: JSON `character_allocations` may contain `defence`; normalize on read API or one-time migration script.
- Update [`packages/website`](packages/website) routes and [`user-stats`](packages/website/src/data-access/user-stats.ts) if they validate keys.

## Client + UI

- [`PlayerClient`](packages/game-client/src/entities/player.ts): new stat fields, `getMaxHealth()` from **destructible** (see prior HUD fix).
- [`InventoryScreenUI`](packages/game-client/src/ui/inventory-screen.ts): labels, plus/minus for new stats; **rename Defence → Evade**.
- [`hearts-panel`](packages/game-client/src/ui/panels/hearts-panel.ts): use real max HP from player/destructible.

## Testing

- Unit tests in `game-shared` for: evade cap, HP/stamina formulas, weight sum default 0.1, allocation validation with new keys.
- Optional: server test for zombie hit → evade roll (deterministic RNG inject if present).

## Risk / balance

- **More stats** share the same XP point budget — each point is weaker per tree unless budget is increased later.
- **Evade** RNG: may feel swingy; consider PRNG seed or displayed “evade rating” only.
- **uint8** caps on serialized health/stamina if network buffer stays 8-bit — confirm max values after large strength/health stacks.

## Out of scope (unless you want them next)

- Client prediction matching encumbrance run speed (server authoritative is OK initially).
- Per-item distinct weights (everything 0.1 kg for now).
