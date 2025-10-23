Now I have a complete understanding of your codebase. Let me analyze the current approach and provide
suggestions.

Current Process Analysis

To add the Exploding Zombie, you had to modify 7 files across 3 packages:

Server (packages/game-server):

1. exploding-zombie.ts - New server entity class
2. entity-manager.ts - Add to entityMap

Client (packages/game-client):

3. exploding-zombie.ts - New client entity class
4. entity-factory.ts - Add to entityMap + import
5. asset.ts - Define animation frames (~10 lines)
6. minimap.ts - Add instanceof check for rendering

Shared (packages/game-shared):

7. constants/index.ts - Add entity type constant

---

My Assessment

Your approach is fundamentally sound, but there's definitely room for improvement. You have good
architecture with:

- Base classes (BaseEnemy, EnemyClient) ✅
- Strategy pattern for movement/attack ✅
- Extension system for behaviors ✅

However, you're experiencing legitimate pain points - not just being lazy:

The Problems:

1. Manual registration in 3 places - entityMap on server, entityMap on client, Zombies array
2. Scattered configuration - Stats are in zombie class, assets in asset.ts, minimap color hardcoded
3. Type-unsafe arrays - The Zombies array can get out of sync with Entities
4. Hardcoded instanceof checks - Minimap has to import and check every zombie type individually
5. Missing from Zombies array - Your ExplodingZombie isn't in the Zombies array (line 33-39 of
   constants/index.ts)

---

Recommendations (Ranked by Impact)

1. Registry Pattern for Auto-Registration (High Impact, Medium Effort)

Instead of manually importing/adding to maps, use a decorator or factory registration:

Example approach:
// packages/game-shared/src/entities/zombie-registry.ts
export const ZOMBIE_REGISTRY = new Map<string, ZombieConfig>();

export interface ZombieConfig {
id: string;
category: 'zombie';
serverClass: string;
clientClass: string;
assetPrefix: string;
minimapColor?: string;
// ... other shared config
}

export function registerZombie(config: ZombieConfig) {
ZOMBIE_REGISTRY.set(config.id, config);
}

Then entity-manager and entity-factory could iterate the registry instead of hardcoding maps.

Impact: Reduces file modifications from 7 to 3 (server class, client class, registry entry)

---

2. Entity Category/Tag System (High Impact, Low Effort)

Replace hardcoded instanceof checks with a tag-based system:

Current minimap.ts:159:
if (entity instanceof ZombieClient ||
entity instanceof BigZombieClient ||
entity instanceof FastZombieClient ||
entity instanceof ExplodingZombieClient) {

Better approach:
// In shared constants
export const EntityCategories = {
ZOMBIE: 'zombie',
ITEM: 'item',
// ...
} as const;

// In EnemyClient or entity base
getCategory(): string {
return 'zombie';
}

// In minimap
if (entity.getCategory?.() === EntityCategories.ZOMBIE) {
color = settings.colors.enemy;
}

Impact: Eliminates need to touch minimap.ts for new zombies

---

3. Asset Convention Over Configuration (Medium Impact, Low Effort)

Your assets already follow a pattern: big_zombie, fast_zombie, exploding_zombie. The client classes return
these via getEnemyAssetPrefix().

Current problem: You still manually define frames in asset.ts (line 216-222)

Solution: Use a standardized frame layout and auto-generate asset maps:

// If all zombies follow the same frame pattern
const zombieTypes = ['zombie', 'big_zombie', 'fast_zombie', 'exploding_zombie'];
zombieTypes.forEach(type => {
const config = ZOMBIE_REGISTRY.get(type);
if (config?.frameLayout) {
createCharacterAssets(type, createCharacterFrames(config.frameLayout));
}
});

Impact: Reduces asset.ts modifications from ~10 lines to potentially 0

---

4. Centralize Zombie Stats (Medium Impact, Medium Effort)

Move stats from individual zombie classes into shared configs:

// packages/game-shared/src/zombies/configs.ts
export const ZOMBIE_CONFIGS = {
exploding_zombie: {
speed: 45,
health: 1,
damage: 0,
dropChance: 0.3,
size: new Vector2(8, 8),
animationDuration: 250,
},
// ...
}

Then zombies become much simpler:

export class ExplodingZombie extends BaseEnemy {
constructor(gameManagers: IGameManagers) {
const config = ZOMBIE_CONFIGS.exploding_zombie;
super(gameManagers, Entities.EXPLODING_ZOMBIE, config);
// Only custom behavior here
}
}

Impact: Makes stats easier to balance and compare

---

5. Code Generation Script (Low Priority)

Create a CLI tool: npm run generate:zombie that scaffolds all necessary files.

Impact: Doesn't reduce files, but automates the boilerplate

---

My Recommendation

Start with #2 (Entity Categories) - it's the quickest win and eliminates the minimap pain point immediately.

Then implement #1 (Registry Pattern) - this is the biggest architectural improvement and will set you up for
easier entity management long-term.

#3 and #4 are nice-to-haves for when you're adding many more zombie types.

---

The Bottom Line

Your current approach isn't bad - you're using good patterns. But touching 7 files per zombie is legitimate
overhead, especially if you plan to add many more enemy types. The improvements above could reduce it to 2-3
files (server class, client class, maybe config entry) with better type safety and maintainability.
