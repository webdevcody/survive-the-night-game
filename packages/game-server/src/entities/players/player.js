import { PlayerHurtEvent } from "../../../../game-shared/src/events/server-sent/events/player-hurt-event";
import Collidable from "@/extensions/collidable";
import Consumable from "@/extensions/consumable";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import Illuminated from "@/extensions/illuminated";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import { coercePlayerInventoryPersistedPayload, } from "@shared/util/persisted-inventory-payload";
import { normalizeVector } from "@shared/util/physics";
import { Cooldown } from "@/entities/util/cooldown";
import { weaponHandlerRegistry } from "@/entities/weapons/weapon-handler-registry";
import { PlayerDeathEvent } from "../../../../game-shared/src/events/server-sent/events/player-death-event";
import { CraftEvent } from "../../../../game-shared/src/events/server-sent/events/craft-event";
import { getConfig } from "@shared/config";
import PoolManager from "@shared/util/pool-manager";
import { SKIN_TYPES, PLAYER_COLORS } from "@shared/commands/commands";
import { itemRegistry } from "@shared/entities";
import { Blood } from "@/entities/effects/blood";
import { SerializableFields } from "@/util/serializable-fields";
import { Direction } from "@/util/direction";
import { performMeleeAttack } from "@/entities/weapons/helpers";
import { Weapon } from "../weapons/weapon";
import InfiniteRun from "@/extensions/infinite-run";
import Snared from "@/extensions/snared";
import { shouldAutoPickup, attemptAutoPickup } from "@/util/auto-pickup";
import { infectionConfig } from "@shared/config/infection-config";
import { CHARACTER_STAT_MODIFIERS, computeEncumbranceStaminaDrainMultiplier, computeInventoryWeightKg, computeMaxInventorySlots, computeMaxPlayerHealth, computeMaxStamina, computeEvadeChance, computePassiveHpRegenIntervalSeconds, computeStaminaRegenMultiplier, } from "@shared/util/character-stats";
import { REGENERATE_HEAL_PER_SECOND } from "@shared/util/skill-tree";
import { getZombieTypesSet } from "@shared/constants";
import { UserSessionCache } from "@/services/user-session-cache";
import { GAME_SERVER_API_KEY, WEBSITE_API_URL } from "@/config/env";
import { weaponRegistry } from "@shared/entities/weapon-registry";
import { itemMatchesLoadoutRow, resolveAttackWeaponFromLoadout } from "@shared/util/weapon-loadout";
import { FISTS_INVENTORY_SENTINEL } from "@shared/constants/inventory-sentinel";
import { emptyPlayerQuestState, parsePlayerQuestState, stringifyPlayerQuestState, } from "@shared/quests/player-quest-state";
import { initPlayerQuestState, tickWaypointSteps } from "@/quests/quest-runtime";
/**
 * Cached list of entity types that players can pass through (collision passthrough).
 * Includes player entity and all items configured with isPassthrough: true.
 * This is computed once at module load time for performance.
 */
const PASSTHROUGH_ENTITY_TYPES = (() => {
    const passthroughTypes = ["player"]; // Players can pass through other players
    // Add all items configured with isPassthrough: true
    itemRegistry.getAll().forEach((itemConfig) => {
        if (itemConfig.isPassthrough) {
            passthroughTypes.push(itemConfig.id);
        }
    });
    return passthroughTypes;
})();
export class Player extends Entity {
    constructor(gameManagers) {
        super(gameManagers, Entities.PLAYER);
        // Internal state
        this.fireCooldown = new Cooldown(0.4, true);
        this.interactCooldown = new Cooldown(Player.INTERACT_COOLDOWN, true);
        this.zombieSpawnCooldown = new Cooldown(infectionConfig.ZOMBIE_SPAWN_COOLDOWN_MS / 1000, true); // Convert ms to seconds
        this.lastWeaponType = null;
        this.exhaustionTimer = 0; // Time remaining before stamina can regenerate
        // Item pickup hold tracking
        this.pickupHoldTimer = 0; // Time F has been held for pickup
        this.targetPickupEntity = null; // Entity ID being targeted for pickup
        /** Accumulator for passive HP regen (hpRecovery stat). */
        this.passiveHpRegenAccumulator = 0;
        /** Open world: restored from DB on connect; consumed when placing spawn. Not serialized. */
        this.pendingLogoutSpawnTile = null;
        /**
         * Respawn tile from campsite-fire bind (hydrated from DB on connect; updated on interact).
         * Mirrored to `respawnBindTileX` / `respawnBindTileY` for the owning client UI.
         */
        this.boundRespawnTile = null;
        /** Real-player client socket id (for website API persistence). AI players leave this null. */
        this.clientSocketId = null;
        this.broadcaster = gameManagers.getBroadcaster();
        // Initialize serializable fields with default values
        // Input fields are stored individually for efficient serialization
        this.serialized = new SerializableFields({
            isCrafting: false,
            skin: SKIN_TYPES.DEFAULT,
            playerColor: PLAYER_COLORS.NONE,
            kills: 0,
            experience: 0,
            ping: 0,
            displayName: "",
            stamina: getConfig().player.MAX_STAMINA,
            maxStamina: getConfig().player.MAX_STAMINA,
            deathTime: 0, // Timestamp when player died, 0 means not dead
            isAI: false, // Whether this player is controlled by AI
            aiState: "", // Current AI state (for debugging)
            isZombie: false, // Whether this player has become a zombie (Battle Royale)
            zombieSpawnCooldownProgress: 1, // 0-1 progress for zombie spawn ability (1 = ready)
            // Input fields stored individually for efficient serialization
            inputFacing: Direction.Right,
            inputDx: 0,
            inputDy: 0,
            inputFire: false,
            inputInventoryItem: 1, // Still tracked for consume/drop when itemType is null
            inputSprint: false,
            inputAimAngle: NaN, // NaN represents undefined for optional field
            inputAimDistance: NaN, // NaN represents undefined for optional field
            skillSprint: 0,
            skillRegenerate: 0,
            statHealth: 0,
            statEvade: 0,
            statAccuracy: 0,
            statReloadSpeed: 0,
            statRunSpeed: 0,
            statLuck: 0,
            statStamina: 0,
            statRecovery: 0,
            statHpRecovery: 0,
            statStrength: 0,
            weaponLoadoutPrimary: 1,
            weaponLoadoutSecondary: 0,
            weaponLoadoutMelee: 3,
            activeWeaponLoadout: 0,
            questStateJson: stringifyPlayerQuestState(emptyPlayerQuestState()),
            respawnBindTileX: -1,
            respawnBindTileY: -1,
        }, () => this.markEntityDirty(), {
            // Define serialization metadata for number fields
            experience: { numberType: "uint32" },
            ping: { numberType: "uint16" },
            inputFacing: { numberType: "uint8" },
            inputInventoryItem: { numberType: "uint8" },
            inputAimAngle: { numberType: "float64", optional: true },
            inputAimDistance: { numberType: "float64", optional: true },
            deathTime: { numberType: "float64" },
            skillSprint: { numberType: "uint8" },
            skillRegenerate: { numberType: "uint8" },
            statHealth: { numberType: "uint8" },
            statEvade: { numberType: "uint8" },
            statAccuracy: { numberType: "uint8" },
            statReloadSpeed: { numberType: "uint8" },
            statRunSpeed: { numberType: "uint8" },
            statLuck: { numberType: "uint8" },
            statStamina: { numberType: "uint8" },
            statRecovery: { numberType: "uint8" },
            statHpRecovery: { numberType: "uint8" },
            statStrength: { numberType: "uint8" },
            weaponLoadoutPrimary: { numberType: "uint8" },
            weaponLoadoutSecondary: { numberType: "uint8" },
            weaponLoadoutMelee: { numberType: "uint8" },
            activeWeaponLoadout: { numberType: "uint8" },
            respawnBindTileX: { numberType: "uint32", optional: true },
            respawnBindTileY: { numberType: "uint32", optional: true },
            // Note: inputSequenceNumber is not in SerializableFields, so no metadata needed
        });
        this.addExtension(new Inventory(this, gameManagers.getBroadcaster()));
        const poolManager = PoolManager.getInstance();
        const collidableSize = poolManager.vector2.claim(Player.PLAYER_WIDTH - 8, Player.PLAYER_WIDTH - 8);
        const collidableOffset = poolManager.vector2.claim(4, 4);
        this.addExtension(new Collidable(this).setSize(collidableSize).setOffset(collidableOffset));
        const positionableSize = poolManager.vector2.claim(Player.PLAYER_WIDTH, Player.PLAYER_WIDTH);
        this.addExtension(new Positionable(this).setSize(positionableSize));
        this.addExtension(new Destructible(this)
            .setHealth(getConfig().player.MAX_PLAYER_HEALTH)
            .setMaxHealth(getConfig().player.MAX_PLAYER_HEALTH)
            .onBeforeDamage((damage, attackerId) => {
            var _a;
            if (attackerId !== undefined) {
                const attacker = this.getEntityManager().getEntityById(attackerId);
                if (attacker && getZombieTypesSet().has(attacker.getType())) {
                    const ev = (_a = this.serialized.get("statEvade")) !== null && _a !== void 0 ? _a : 0;
                    if (Math.random() < computeEvadeChance(ev)) {
                        return 0;
                    }
                }
            }
            return damage;
        })
            .onDamaged(() => {
            // Broadcast PlayerHurtEvent when player takes damage (e.g., from zombie attacks)
            this.broadcaster.broadcastEvent(new PlayerHurtEvent(this.getId()));
        })
            .onDeath(() => this.onDeath()));
        this.addExtension(new Updatable(this, this.updatePlayer.bind(this)));
        this.addExtension(new Movable(this));
        this.addExtension(new Illuminated(this, getConfig().world.LIGHT_RADIUS_PLAYER));
        this.addExtension(new Groupable(this, "friendly"));
        this.applyWeaponLoadoutSelection();
    }
    get activeItem() {
        return this.getExt(Inventory).getActiveItem(this.serialized.get("inputInventoryItem"));
    }
    setIsCrafting(isCrafting) {
        this.serialized.set("isCrafting", isCrafting);
    }
    getIsCrafting() {
        return this.serialized.get("isCrafting");
    }
    isDead() {
        return this.getExt(Destructible).isDead();
    }
    isZombie() {
        return this.serialized.get("isZombie");
    }
    setIsZombie(value) {
        this.serialized.set("isZombie", value);
        if (value) {
            this.serialized.set("skin", SKIN_TYPES.ZOMBIE);
        }
    }
    getHealth() {
        return this.getExt(Destructible).getHealth();
    }
    getMaxHealth() {
        return this.getExt(Destructible).getMaxHealth();
    }
    getDamageBox() {
        return this.getExt(Destructible).getDamageBox();
    }
    damage(damage) {
        if (this.isDead()) {
            return;
        }
        this.getExt(Destructible).damage(damage);
        this.broadcaster.broadcastEvent(new PlayerHurtEvent(this.getId()));
        // Create blood entity at player position
        const position = this.getExt(Positionable).getPosition();
        const blood = new Blood(this.getGameManagers());
        blood.getExt(Positionable).setPosition(position);
        this.getEntityManager().addEntity(blood);
    }
    onDeath() {
        this.setIsCrafting(false);
        // In Battle Royale mode, drop all inventory items on death
        const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
        if (!strategy.getConfig().allowRespawn) {
            // Drop all items when respawning is disabled (Battle Royale)
            this.getExt(Inventory).scatterItems(this.getPosition());
        }
        this.serialized.set("deathTime", Date.now());
        this.broadcaster.broadcastEvent(new PlayerDeathEvent({
            playerId: this.getId(),
            displayName: this.getDisplayName(),
        }));
        this.getExt(Collidable).setEnabled(false);
    }
    respawn() {
        if (!this.isDead())
            return;
        // Check respawn cooldown
        const deathTime = this.serialized.get("deathTime");
        if (deathTime > 0) {
            const timeSinceDeath = Date.now() - deathTime;
            if (timeSinceDeath < Player.RESPAWN_COOLDOWN_MS) {
                return; // Still in cooldown
            }
        }
        // Clear death time
        this.serialized.set("deathTime", 0);
        // Don't clear inventory - keep items on respawn
        // this.getExt(Inventory).clear();
        // Re-enable collision
        this.getExt(Collidable).setEnabled(true);
        // Set health to max
        const maxHealth = this.getExt(Destructible).getMaxHealth();
        this.getExt(Destructible).setHealth(maxHealth);
        const mapManager = this.getGameManagers().getMapManager();
        if (this.boundRespawnTile) {
            const restored = mapManager.tryGetPositionForSavedTile(this.boundRespawnTile.x, this.boundRespawnTile.y);
            if (restored) {
                this.setPosition(restored);
                return;
            }
            this.boundRespawnTile = null;
            this.syncBoundRespawnToSerialized();
            this.queueClearRespawnBindInDb();
        }
        const spawnPosition = mapManager.getPlayerSpawnPositionForMap();
        this.setPosition(spawnPosition);
    }
    setClientSocketId(socketId) {
        this.clientSocketId = socketId;
    }
    getClientSocketId() {
        return this.clientSocketId;
    }
    getBoundRespawnTile() {
        return this.boundRespawnTile;
    }
    setBoundRespawnTile(tileX, tileY) {
        this.boundRespawnTile = { x: tileX, y: tileY };
        this.syncBoundRespawnToSerialized();
        this.queuePersistRespawnBindToWebsite();
    }
    syncBoundRespawnToSerialized() {
        if (!this.boundRespawnTile) {
            this.serialized.set("respawnBindTileX", -1);
            this.serialized.set("respawnBindTileY", -1);
            return;
        }
        this.serialized.set("respawnBindTileX", this.boundRespawnTile.x);
        this.serialized.set("respawnBindTileY", this.boundRespawnTile.y);
    }
    queuePersistRespawnBindToWebsite() {
        if (!GAME_SERVER_API_KEY || !this.boundRespawnTile || !this.clientSocketId) {
            return;
        }
        const userId = UserSessionCache.getInstance().getUserIdBySocket(this.clientSocketId);
        if (!userId) {
            return;
        }
        const url = `${WEBSITE_API_URL}/api/game/player-respawn-bind`;
        const tile = this.boundRespawnTile;
        void (async () => {
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-API-Key": GAME_SERVER_API_KEY,
                    },
                    body: JSON.stringify({
                        userId,
                        respawnTileX: tile.x,
                        respawnTileY: tile.y,
                    }),
                });
                if (!res.ok) {
                    const t = await res.text().catch(() => "");
                    console.warn(`[respawn-bind] HTTP ${res.status} for user ${userId}: ${t.slice(0, 300)}`);
                }
            }
            catch (e) {
                console.warn(`[respawn-bind] failed for user ${userId}:`, e);
            }
        })();
    }
    queueClearRespawnBindInDb() {
        if (!GAME_SERVER_API_KEY || !this.clientSocketId) {
            return;
        }
        const userId = UserSessionCache.getInstance().getUserIdBySocket(this.clientSocketId);
        if (!userId) {
            return;
        }
        const url = `${WEBSITE_API_URL}/api/game/player-respawn-bind`;
        void (async () => {
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-API-Key": GAME_SERVER_API_KEY,
                    },
                    body: JSON.stringify({ userId, clear: true }),
                });
                if (!res.ok) {
                    const t = await res.text().catch(() => "");
                    console.warn(`[respawn-bind clear] HTTP ${res.status} for user ${userId}: ${t.slice(0, 300)}`);
                }
            }
            catch (e) {
                console.warn(`[respawn-bind clear] failed for user ${userId}:`, e);
            }
        })();
    }
    getRespawnCooldownRemaining() {
        const deathTime = this.serialized.get("deathTime");
        if (deathTime === 0)
            return 0;
        const timeSinceDeath = Date.now() - deathTime;
        const remaining = Player.RESPAWN_COOLDOWN_MS - timeSinceDeath;
        return Math.max(0, remaining);
    }
    getDeathTime() {
        return this.serialized.get("deathTime");
    }
    setDeathTime(value) {
        this.serialized.set("deathTime", value);
    }
    isInventoryFull() {
        return this.getExt(Inventory).isFull();
    }
    hasInInventory(key) {
        return this.getExt(Inventory).hasItem(key);
    }
    getCenterPosition() {
        const positionable = this.getExt(Positionable);
        return positionable.getCenterPosition();
    }
    getHitbox() {
        const collidable = this.getExt(Collidable);
        const hitbox = collidable.getHitBox();
        return hitbox;
    }
    getVelocity() {
        return this.getExt(Movable).getVelocity();
    }
    getPosition() {
        const positionable = this.getExt(Positionable);
        return positionable.getPosition();
    }
    getInventory() {
        return this.getExt(Inventory).getItems();
    }
    clearInventory() {
        this.getExt(Inventory).clear();
    }
    resolveAttackWeaponItem() {
        const resolved = resolveAttackWeaponFromLoadout(this.getInventory(), this.getMaxInventorySlots(), this.serialized.get("activeWeaponLoadout"), this.serialized.get("weaponLoadoutPrimary"), this.serialized.get("weaponLoadoutSecondary"), this.serialized.get("weaponLoadoutMelee"));
        if (!resolved)
            return { kind: "fists" };
        return { kind: "weapon", item: resolved.item, bagIndex1Based: resolved.bagIndex1Based };
    }
    performFistAttack() {
        var _a, _b;
        const weaponKey = "fists";
        const cfg = weaponRegistry.get(weaponKey);
        const cooldown = (_a = cfg === null || cfg === void 0 ? void 0 : cfg.stats.cooldown) !== null && _a !== void 0 ? _a : 0.85;
        if (this.fireCooldown === null || this.lastWeaponType !== weaponKey) {
            this.fireCooldown = new Cooldown(cooldown * this.getReloadCooldownMultiplier(), true);
            this.lastWeaponType = weaponKey;
        }
        if (!this.fireCooldown.isReady())
            return;
        this.fireCooldown.reset();
        const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
        const aimAngle = this.serialized.get("inputAimAngle");
        performMeleeAttack({
            entityManager: this.getEntityManager(),
            gameManagers: this.getGameManagers(),
            attackerId: this.getId(),
            position: this.getCenterPosition().clone(),
            facing: this.serialized.get("inputFacing"),
            aimAngle: isNaN(aimAngle) ? undefined : aimAngle,
            attackRange: getConfig().combat.FIST_ATTACK_RANGE,
            damage: (_b = cfg === null || cfg === void 0 ? void 0 : cfg.stats.damage) !== null && _b !== void 0 ? _b : 1,
            knockbackDistance: cfg === null || cfg === void 0 ? void 0 : cfg.stats.pushDistance,
            weaponKey,
            targetFilter: (entity, attackerId) => {
                return strategy.shouldDamageTarget(this, entity, attackerId);
            },
        });
    }
    /** Select primary (0), secondary (1), or melee (2) loadout — same as client SELECT_WEAPON_LOADOUT. */
    selectWeaponLoadout(loadout) {
        const lo = Math.max(0, Math.min(2, Math.floor(loadout)));
        this.serialized.set("activeWeaponLoadout", lo);
        this.applyWeaponLoadoutSelection();
    }
    /**
     * Assign a bag slot to a weapon loadout (0 = clear). Validates item type per slot.
     * Same rules as SET_WEAPON_LOADOUT_SLOT from clients.
     * When equipping, moves/swaps bag items so the clicked slot is cleared when possible:
     * - empty loadout: move weapon to first empty cell and point loadout there (source cleared);
     *   if the bag is full, only the loadout pointer is set (legacy).
     * - loadout already set: swap clicked cell with the loadout's backing cell (ref unchanged).
     * When clearing, move the hidden backing weapon to the earliest empty visible bag cell if one exists.
     */
    assignWeaponLoadoutSlot(slot, bagIndex) {
        const max = this.getMaxInventorySlots();
        const slotClamped = Math.max(0, Math.min(2, Math.floor(slot)));
        const bagIndexClamped = Math.max(0, Math.min(max, Math.floor(bagIndex)));
        const invExt = this.getExt(Inventory);
        const key = slotClamped === 0
            ? "weaponLoadoutPrimary"
            : slotClamped === 1
                ? "weaponLoadoutSecondary"
                : "weaponLoadoutMelee";
        if (bagIndexClamped === 0) {
            const prevRef = this.serialized.get(key);
            if (prevRef >= 1 && prevRef <= max) {
                const inv = this.getInventory();
                let emptyIdx0 = null;
                for (let i = 0; i < max; i++) {
                    if (i === prevRef - 1)
                        continue;
                    if (inv[i] == null) {
                        emptyIdx0 = i;
                        break;
                    }
                }
                if (emptyIdx0 !== null) {
                    invExt.swapBagSlotsDeferWeaponResync(prevRef - 1, emptyIdx0);
                }
            }
            this.serialized.set(key, 0);
            this.applyWeaponLoadoutSelection();
            return;
        }
        const inv = this.getInventory();
        const item = inv[bagIndexClamped - 1];
        if (!item)
            return;
        if (!itemMatchesLoadoutRow(item.itemType, slotClamped))
            return;
        const prevRef = this.serialized.get(key);
        if (prevRef === bagIndexClamped) {
            this.applyWeaponLoadoutSelection();
            return;
        }
        if (prevRef === 0) {
            let emptyIdx0 = null;
            for (let i = 0; i < max; i++) {
                if (inv[i] == null) {
                    emptyIdx0 = i;
                    break;
                }
            }
            if (emptyIdx0 !== null) {
                invExt.swapBagSlotsDeferWeaponResync(bagIndexClamped - 1, emptyIdx0);
                this.serialized.set(key, emptyIdx0 + 1);
            }
            else {
                this.serialized.set(key, bagIndexClamped);
            }
        }
        else {
            invExt.swapBagSlotsDeferWeaponResync(prevRef - 1, bagIndexClamped - 1);
        }
        this.sanitizeWeaponLoadouts();
    }
    sanitizeWeaponLoadouts() {
        const inv = this.getInventory();
        const max = this.getMaxInventorySlots();
        const check = (key) => {
            const idx = this.serialized.get(key);
            if (idx < 1 || idx > max) {
                this.serialized.set(key, 0);
                return;
            }
            const item = inv[idx - 1];
            if (!item) {
                this.serialized.set(key, 0);
                return;
            }
            const row = key === "weaponLoadoutPrimary" ? 0 : key === "weaponLoadoutSecondary" ? 1 : 2;
            if (!itemMatchesLoadoutRow(item.itemType, row))
                this.serialized.set(key, 0);
        };
        check("weaponLoadoutPrimary");
        check("weaponLoadoutSecondary");
        check("weaponLoadoutMelee");
        this.applyWeaponLoadoutSelection();
    }
    applyWeaponLoadoutSelection() {
        const lo = this.serialized.get("activeWeaponLoadout");
        const max = this.getMaxInventorySlots();
        const inv = this.getInventory();
        const at = (idx) => (idx >= 1 && idx <= max ? inv[idx - 1] : null);
        if (lo === 0) {
            const idx = this.serialized.get("weaponLoadoutPrimary");
            if (idx >= 1 && idx <= max && at(idx) && itemMatchesLoadoutRow(at(idx).itemType, 0)) {
                this.selectInventoryItemOnly(idx);
                return;
            }
            this.selectInventoryItemOnly(FISTS_INVENTORY_SENTINEL);
            return;
        }
        if (lo === 1) {
            const idx = this.serialized.get("weaponLoadoutSecondary");
            if (idx >= 1 && idx <= max && at(idx) && itemMatchesLoadoutRow(at(idx).itemType, 1)) {
                this.selectInventoryItemOnly(idx);
                return;
            }
            this.selectInventoryItemOnly(FISTS_INVENTORY_SENTINEL);
            return;
        }
        if (lo === 2) {
            const idx = this.serialized.get("weaponLoadoutMelee");
            if (idx >= 1 && idx <= max && at(idx) && itemMatchesLoadoutRow(at(idx).itemType, 2)) {
                this.selectInventoryItemOnly(idx);
                return;
            }
            this.selectInventoryItemOnly(FISTS_INVENTORY_SENTINEL);
            return;
        }
    }
    getActiveWeapon() {
        const resolved = this.resolveAttackWeaponItem();
        if (resolved.kind === "weapon")
            return resolved.item;
        return null;
    }
    setPosition(position) {
        this.getExt(Positionable).setPosition(position);
    }
    craftRecipe(recipe) {
        var _a, _b;
        const inventory = this.getExt(Inventory);
        const originalInventoryJson = JSON.stringify(inventory.getItems());
        const result = inventory.craftRecipe(recipe);
        // Check if crafting succeeded (inventory changed or item was dropped)
        const inventoryChanged = JSON.stringify(inventory.getItems()) !== originalInventoryJson;
        const craftingSucceeded = inventoryChanged || result.itemToDrop !== undefined;
        // If inventory was full, drop the crafted item on the ground
        if (result.itemToDrop) {
            const entity = (_a = this.getEntityManager()) === null || _a === void 0 ? void 0 : _a.createEntityFromItem(result.itemToDrop);
            if (entity) {
                const position = this.getExt(Positionable).getPosition();
                // Add small random offset so it doesn't spawn exactly on the player
                const offset = 20;
                const theta = Math.random() * 2 * Math.PI;
                const poolManager = PoolManager.getInstance();
                const pos = poolManager.vector2.claim(position.x + offset * Math.cos(theta), position.y + offset * Math.sin(theta));
                if ("setPosition" in entity) {
                    entity.setPosition(pos);
                }
                else if (entity.hasExt(Positionable)) {
                    entity.getExt(Positionable).setPosition(pos);
                }
                (_b = this.getEntityManager()) === null || _b === void 0 ? void 0 : _b.addEntity(entity);
            }
        }
        // Broadcast craft event if crafting succeeded
        if (craftingSucceeded) {
            this.getGameManagers().getBroadcaster().broadcastEvent(new CraftEvent(this.getId()));
        }
        this.setIsCrafting(false);
    }
    handleAttack(deltaTime) {
        this.fireCooldown.update(deltaTime);
        if (!this.serialized.get("inputFire"))
            return;
        // Zombie players can only use claw attacks
        if (this.isZombie()) {
            this.handleZombieClawAttack();
            return;
        }
        // Check if active item is a consumable (like energy drink or bandage)
        const activeItem = this.activeItem;
        if (activeItem) {
            const activeItemEntity = this.getEntityManager().createEntityFromItem(activeItem);
            if (activeItemEntity && activeItemEntity.hasExt(Consumable)) {
                const invSlot = this.serialized.get("inputInventoryItem");
                if (invSlot === FISTS_INVENTORY_SENTINEL) {
                    activeItemEntity.clearDirtyFlags();
                    return;
                }
                const itemIndex = invSlot - 1;
                const itemType = activeItem.itemType;
                // Reset cooldown when switching to a consumable from a different item type
                // This ensures weapon cooldowns don't block consumable use
                if (this.fireCooldown === null || this.lastWeaponType !== itemType) {
                    this.fireCooldown = new Cooldown(0.5 * this.getReloadCooldownMultiplier(), true);
                    this.lastWeaponType = itemType;
                }
                // Add a small cooldown to prevent rapid consumption
                if (this.fireCooldown.isReady()) {
                    this.fireCooldown.reset();
                }
                else {
                    // Still on cooldown, don't consume yet
                    activeItemEntity.clearDirtyFlags();
                    return;
                }
                // Consume the item (handles energy drink, bandage, and other consumables)
                activeItemEntity.getExt(Consumable).consume(this.getId(), itemIndex);
                activeItemEntity.clearDirtyFlags();
                return;
            }
            // If it's not a consumable, clear the entity and continue to weapon handling
            if (activeItemEntity) {
                activeItemEntity.clearDirtyFlags();
            }
        }
        const resolved = this.resolveAttackWeaponItem();
        if (resolved.kind === "fists") {
            this.performFistAttack();
            return;
        }
        const activeWeapon = resolved.item;
        const inventoryIndex = resolved.bagIndex1Based - 1;
        const weaponEntity = this.getEntityManager().createEntityFromItem(activeWeapon);
        if (!weaponEntity) {
            return;
        }
        weaponEntity.clearDirtyFlags();
        const weaponType = activeWeapon.itemType;
        const customHandler = weaponHandlerRegistry.get(weaponType);
        if (customHandler) {
            if (this.fireCooldown === null || this.lastWeaponType !== weaponType) {
                this.fireCooldown = new Cooldown(customHandler.cooldown * this.getReloadCooldownMultiplier(), true);
                this.lastWeaponType = weaponType;
            }
            if (this.fireCooldown.isReady()) {
                this.fireCooldown.reset();
                customHandler.handler(weaponEntity, this.getId(), this.getCenterPosition().clone(), this.serialized.get("inputFacing"), this.serialized.get("inputAimAngle"), inventoryIndex);
                weaponEntity.clearDirtyFlags();
            }
            return;
        }
        if (!(weaponEntity instanceof Weapon)) {
            return;
        }
        if (this.fireCooldown === null || this.lastWeaponType !== weaponType) {
            this.fireCooldown = new Cooldown(weaponEntity.getCooldown() * this.getReloadCooldownMultiplier(), true);
            this.lastWeaponType = weaponType;
        }
        if (this.fireCooldown.isReady()) {
            this.fireCooldown.reset();
            weaponEntity.attack(this.getId(), this.getCenterPosition().clone(), this.serialized.get("inputFacing"), this.serialized.get("inputAimAngle"), this.serialized.get("inputAimDistance"));
            weaponEntity.clearDirtyFlags();
        }
    }
    handleZombieClawAttack() {
        // Set cooldown for zombie claw attack if not already set
        if (this.lastWeaponType !== "zombie_claw") {
            this.fireCooldown = new Cooldown(getConfig().combat.ZOMBIE_PLAYER_CLAW_COOLDOWN, true);
            this.lastWeaponType = "zombie_claw";
        }
        if (!this.fireCooldown.isReady())
            return;
        this.fireCooldown.reset();
        const aimAngle = this.serialized.get("inputAimAngle");
        // Use the reusable melee attack utility
        performMeleeAttack({
            entityManager: this.getEntityManager(),
            gameManagers: this.getGameManagers(),
            attackerId: this.getId(),
            position: this.getCenterPosition(),
            facing: this.serialized.get("inputFacing"),
            aimAngle: isNaN(aimAngle) ? undefined : aimAngle,
            attackRange: getConfig().combat.ZOMBIE_PLAYER_CLAW_RANGE,
            damage: getConfig().combat.ZOMBIE_PLAYER_CLAW_DAMAGE,
            weaponKey: "knife", // Use knife animation for claw attack
            targetFilter: (entity, attackerId) => {
                // Don't target self
                if (entity.getId() === attackerId)
                    return false;
                // Zombie players can damage living non-zombie players
                if (entity instanceof Player) {
                    return !entity.isZombie() && !entity.isDead();
                }
                // Zombie players can also damage the car
                if (entity.getType() === Entities.CAR) {
                    return true;
                }
                return false;
            },
        });
    }
    handleMovement(deltaTime) {
        var _a, _b;
        const movable = this.getExt(Movable);
        // If snared (e.g., by bear trap), cannot move at all
        if (this.hasExt(Snared)) {
            const poolManager = PoolManager.getInstance();
            movable.setVelocity(poolManager.vector2.claim(0, 0));
            return;
        }
        const currentVelocity = movable.getVelocity();
        // Only set velocity from input if we're not being knocked back
        // (knockback velocity will be much higher than normal movement speed)
        const currentSpeed = Math.sqrt(currentVelocity.x * currentVelocity.x + currentVelocity.y * currentVelocity.y);
        if (currentSpeed < getConfig().player.PLAYER_SPEED * 2) {
            // Set velocity based on current input
            const poolManager = PoolManager.getInstance();
            const inputDx = this.serialized.get("inputDx");
            const inputDy = this.serialized.get("inputDy");
            if (inputDx === 0 && inputDy === 0) {
                movable.setVelocity(poolManager.vector2.claim(0, 0));
            }
            else {
                const inputVec = poolManager.vector2.claim(inputDx, inputDy);
                const normalized = normalizeVector(inputVec);
                // Check if infinite run extension is active
                const hasInfiniteRun = this.hasExt(InfiniteRun);
                const isZombie = this.serialized.get("isZombie");
                const stamina = this.serialized.get("stamina");
                const hasSprintSkill = ((_a = this.serialized.get("skillSprint")) !== null && _a !== void 0 ? _a : 0) > 0;
                const canSprint = !isZombie &&
                    hasSprintSkill &&
                    this.serialized.get("inputSprint") &&
                    (hasInfiniteRun || (stamina > 0 && this.exhaustionTimer <= 0));
                const sprintMultiplier = canSprint ? getConfig().player.SPRINT_MULTIPLIER : 1;
                // Apply zombie speed reduction (70% speed)
                const zombieMultiplier = isZombie ? getConfig().player.ZOMBIE_SPEED_MULTIPLIER : 1;
                const runStat = (_b = this.serialized.get("statRunSpeed")) !== null && _b !== void 0 ? _b : 0;
                const runBonus = 1 + runStat * CHARACTER_STAT_MODIFIERS.runSpeedPerPoint;
                const speedMultiplier = sprintMultiplier * zombieMultiplier * runBonus;
                // Drain stamina while sprinting (unless infinite run is active)
                if (canSprint && !hasInfiniteRun) {
                    const inventory = this.getExt(Inventory);
                    const weightKg = computeInventoryWeightKg(inventory.getItems(), inventory.getEquipment());
                    const encMult = computeEncumbranceStaminaDrainMultiplier(weightKg);
                    const newStamina = stamina - getConfig().player.STAMINA_DRAIN_RATE * encMult * deltaTime;
                    this.serialized.set("stamina", Math.max(0, newStamina));
                    // maxStamina doesn't change, but mark it dirty for consistency if needed
                    const maxStamina = this.serialized.get("maxStamina");
                    this.serialized.set("maxStamina", maxStamina);
                    // If stamina just hit zero, start exhaustion timer
                    if (newStamina <= 0) {
                        this.exhaustionTimer = getConfig().player.EXHAUSTION_DURATION;
                    }
                }
                movable.setVelocity(poolManager.vector2.claim(normalized.x * getConfig().player.PLAYER_SPEED * speedMultiplier, normalized.y * getConfig().player.PLAYER_SPEED * speedMultiplier));
            }
        }
        // Handle position updates and collisions
        const position = this.getPosition();
        const previousX = position.x;
        const previousY = position.y;
        const velocity = movable.getVelocity();
        position.x += velocity.x * deltaTime;
        this.setPosition(position);
        if (this.getEntityManager().isColliding(this, PASSTHROUGH_ENTITY_TYPES)) {
            position.x = previousX;
            this.setPosition(position);
        }
        position.y += velocity.y * deltaTime;
        this.setPosition(position);
        if (this.getEntityManager().isColliding(this, PASSTHROUGH_ENTITY_TYPES)) {
            position.y = previousY;
            this.setPosition(position);
        }
    }
    setDisplayName(displayName) {
        this.serialized.set("displayName", displayName);
    }
    getDisplayName() {
        return this.serialized.get("displayName");
    }
    handleStamina(deltaTime) {
        var _a;
        // Update exhaustion timer
        if (this.exhaustionTimer > 0) {
            this.exhaustionTimer = Math.max(0, this.exhaustionTimer - deltaTime);
        }
        const maxStamina = this.serialized.get("maxStamina");
        const stamina = this.serialized.get("stamina");
        const hasInfiniteRun = this.hasExt(InfiniteRun);
        if (this.exhaustionTimer <= 0 && stamina < maxStamina) {
            const inputDx = this.serialized.get("inputDx");
            const inputDy = this.serialized.get("inputDy");
            const isMoving = inputDx !== 0 || inputDy !== 0;
            const isSprinting = this.serialized.get("inputSprint") && isMoving && (hasInfiniteRun || stamina > 0);
            // Regenerate stamina when not sprinting
            if (!isSprinting) {
                const oldStamina = stamina;
                const recMult = computeStaminaRegenMultiplier((_a = this.serialized.get("statRecovery")) !== null && _a !== void 0 ? _a : 0);
                const newStamina = Math.min(maxStamina, stamina + getConfig().player.STAMINA_REGEN_RATE * recMult * deltaTime);
                this.serialized.set("stamina", newStamina);
                if (Math.abs(oldStamina - newStamina) > 0.01) {
                    this.serialized.set("maxStamina", maxStamina);
                }
            }
        }
    }
    handleAutoPickup() {
        // Zombies cannot pick up items
        if (this.isZombie()) {
            return;
        }
        const playerPos = this.getCenterPosition();
        const autoPickupRadius = getConfig().player.AUTO_PICKUP_RADIUS;
        // Get nearby entities that might be pickupable
        const nearbyEntities = this.getEntityManager().getNearbyEntities(playerPos, autoPickupRadius);
        for (const entity of nearbyEntities) {
            // Skip self
            if (entity.getId() === this.getId()) {
                continue;
            }
            // Skip entities already marked for removal
            if (entity.isMarkedForRemoval()) {
                continue;
            }
            // Check if entity has Interactive extension (required for pickup)
            if (!entity.hasExt(Interactive)) {
                continue;
            }
            // Check if should auto-pickup
            if (shouldAutoPickup(entity, this)) {
                attemptAutoPickup(entity, this);
                // Continue to pick up all eligible items (user requested "all at once")
            }
        }
    }
    updatePlayer(deltaTime) {
        if (this.serialized.get("isCrafting")) {
            return;
        }
        if (this.isDead()) {
            return;
        }
        this.handleAttack(deltaTime);
        this.handleMovement(deltaTime);
        this.handleStamina(deltaTime);
        this.handleRegenerateHealing(deltaTime);
        this.handlePassiveHpRegen(deltaTime);
        this.handleAutoPickup();
        this.updateLighting();
        this.updateZombieSpawnCooldown(deltaTime);
        tickWaypointSteps(this, this.getGameManagers().getMapManager());
    }
    updateZombieSpawnCooldown(deltaTime) {
        // Only update cooldown for zombie players
        if (!this.isZombie()) {
            return;
        }
        this.zombieSpawnCooldown.update(deltaTime);
        // Update the serialized progress (0 = just used, 1 = ready)
        const totalDuration = infectionConfig.ZOMBIE_SPAWN_COOLDOWN_MS / 1000;
        const remaining = this.zombieSpawnCooldown.getRemainingTime();
        const progress = 1 - remaining / totalDuration;
        this.serialized.set("zombieSpawnCooldownProgress", Math.min(1, Math.max(0, progress)));
    }
    updateLighting() {
        if (!this.hasExt(Illuminated)) {
            return;
        }
        const illuminated = this.getExt(Illuminated);
        let totalLightIntensity = 0;
        // Check all inventory items for light intensity
        // Note: activeItem is also in the inventory array, so we only need to check inventory
        const inventory = this.getExt(Inventory);
        const inventoryItems = inventory.getItems();
        for (const item of inventoryItems) {
            if (item) {
                const itemConfig = itemRegistry.get(item.itemType);
                if (itemConfig === null || itemConfig === void 0 ? void 0 : itemConfig.lightIntensity) {
                    totalLightIntensity += itemConfig.lightIntensity;
                }
            }
        }
        illuminated.setRadius(totalLightIntensity);
    }
    setInput(input) {
        var _a, _b, _c, _d, _e, _f, _g;
        // Map input object to individual serialized fields
        this.serialized.set("inputFacing", (_a = input.facing) !== null && _a !== void 0 ? _a : Direction.Right);
        this.serialized.set("inputDx", (_b = input.dx) !== null && _b !== void 0 ? _b : 0);
        this.serialized.set("inputDy", (_c = input.dy) !== null && _c !== void 0 ? _c : 0);
        this.serialized.set("inputFire", (_d = input.fire) !== null && _d !== void 0 ? _d : false);
        this.serialized.set("inputSprint", (_e = input.sprint) !== null && _e !== void 0 ? _e : false);
        this.serialized.set("inputAimAngle", (_f = input.aimAngle) !== null && _f !== void 0 ? _f : NaN); // NaN represents undefined
        this.serialized.set("inputAimDistance", (_g = input.aimDistance) !== null && _g !== void 0 ? _g : NaN); // NaN represents undefined
    }
    selectInventoryItemOnly(index) {
        const previousSlot = this.serialized.get("inputInventoryItem");
        this.serialized.set("inputInventoryItem", index);
        if (previousSlot !== index) {
            const inventory = this.getExt(Inventory);
            this.markExtensionDirty(inventory);
        }
    }
    selectInventoryItem(index) {
        this.selectInventoryItemOnly(index);
        if (index === FISTS_INVENTORY_SENTINEL) {
            return;
        }
        const p = this.serialized.get("weaponLoadoutPrimary");
        const s = this.serialized.get("weaponLoadoutSecondary");
        const m = this.serialized.get("weaponLoadoutMelee");
        if (index === p)
            this.serialized.set("activeWeaponLoadout", 0);
        else if (index === s)
            this.serialized.set("activeWeaponLoadout", 1);
        else if (index === m)
            this.serialized.set("activeWeaponLoadout", 2);
    }
    setAsFiring(firing) {
        this.serialized.set("inputFire", firing);
    }
    heal(amount) {
        this.getExt(Destructible).heal(amount);
    }
    update(deltaTime) {
        if (this.isDead()) {
            return;
        }
    }
    setSkin(skin) {
        this.serialized.set("skin", skin);
    }
    getSkin() {
        return this.serialized.get("skin");
    }
    setPlayerColor(color) {
        this.serialized.set("playerColor", color);
    }
    getPlayerColor() {
        return this.serialized.get("playerColor");
    }
    incrementKills() {
        const currentKills = this.serialized.get("kills") || 0;
        this.serialized.set("kills", currentKills + 1);
    }
    getKills() {
        return this.serialized.get("kills") || 0;
    }
    setPing(ping) {
        this.serialized.set("ping", ping);
    }
    getPing() {
        return this.serialized.get("ping");
    }
    // Zombie spawn cooldown methods
    isZombieSpawnReady() {
        return this.zombieSpawnCooldown.isReady();
    }
    resetZombieSpawnCooldown() {
        this.zombieSpawnCooldown.reset();
        this.serialized.set("zombieSpawnCooldownProgress", 0);
    }
    setZombieSpawnReady() {
        this.zombieSpawnCooldown.setAsReady();
        this.serialized.set("zombieSpawnCooldownProgress", 1);
    }
    getZombieSpawnCooldownProgress() {
        return this.serialized.get("zombieSpawnCooldownProgress");
    }
    getReloadCooldownMultiplier() {
        var _a;
        const r = (_a = this.serialized.get("statReloadSpeed")) !== null && _a !== void 0 ? _a : 0;
        return Math.max(0.5, 1 - r * CHARACTER_STAT_MODIFIERS.reloadSpeedCooldownReductionPerPoint);
    }
    /** Multiplier on bullet spread / aim error (lower = more accurate). */
    getAccuracySpreadMultiplier() {
        var _a;
        const acc = (_a = this.serialized.get("statAccuracy")) !== null && _a !== void 0 ? _a : 0;
        return Math.max(0.2, 1 - acc * CHARACTER_STAT_MODIFIERS.accuracySpreadReductionPerPoint);
    }
    /** Extra coins when picking up coin entities (luck stat). */
    getLuckCoinPickupBonus() {
        var _a;
        const luck = (_a = this.serialized.get("statLuck")) !== null && _a !== void 0 ? _a : 0;
        return Math.min(3, Math.floor(luck / 4));
    }
    /**
     * Apply skill + character allocation maps from DB (normalized keys, values 0+).
     */
    applyPersistedProgress(skillAllocations, characterAllocations) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        const sprint = Math.min(1, Math.floor((_a = skillAllocations.sprint) !== null && _a !== void 0 ? _a : 0));
        const regen = Math.min(1, Math.floor((_b = skillAllocations.regenerate) !== null && _b !== void 0 ? _b : 0));
        this.serialized.set("skillSprint", sprint);
        this.serialized.set("skillRegenerate", regen);
        const rawAlloc = characterAllocations;
        const evadeRaw = (_d = (_c = rawAlloc.evade) !== null && _c !== void 0 ? _c : rawAlloc.defence) !== null && _d !== void 0 ? _d : 0;
        this.serialized.set("statHealth", Math.min(99, Math.floor((_e = characterAllocations.health) !== null && _e !== void 0 ? _e : 0)));
        this.serialized.set("statEvade", Math.min(99, Math.floor(evadeRaw)));
        this.serialized.set("statAccuracy", Math.min(99, Math.floor((_f = characterAllocations.accuracy) !== null && _f !== void 0 ? _f : 0)));
        this.serialized.set("statReloadSpeed", Math.min(99, Math.floor((_g = characterAllocations.reloadSpeed) !== null && _g !== void 0 ? _g : 0)));
        this.serialized.set("statRunSpeed", Math.min(99, Math.floor((_h = characterAllocations.runSpeed) !== null && _h !== void 0 ? _h : 0)));
        this.serialized.set("statLuck", Math.min(99, Math.floor((_j = characterAllocations.luck) !== null && _j !== void 0 ? _j : 0)));
        this.serialized.set("statStamina", Math.min(99, Math.floor((_k = characterAllocations.stamina) !== null && _k !== void 0 ? _k : 0)));
        this.serialized.set("statRecovery", Math.min(99, Math.floor((_l = characterAllocations.recovery) !== null && _l !== void 0 ? _l : 0)));
        this.serialized.set("statHpRecovery", Math.min(99, Math.floor((_m = characterAllocations.hpRecovery) !== null && _m !== void 0 ? _m : 0)));
        this.serialized.set("statStrength", Math.min(99, Math.floor((_o = characterAllocations.strength) !== null && _o !== void 0 ? _o : 0)));
        this.applyDerivedStatsFromAllocations();
    }
    /** Called when connecting with persisted website data (keeps fields encapsulated). */
    hydratePersistedProgress(progress) {
        this.serialized.set("experience", Math.max(0, Math.floor(progress.experience)));
        this.applyPersistedProgress(progress.skillAllocations, progress.characterAllocations);
        initPlayerQuestState(this, progress.questProgress);
        const lx = progress.lastTileX;
        const ly = progress.lastTileY;
        if (typeof lx === "number" &&
            Number.isFinite(lx) &&
            typeof ly === "number" &&
            Number.isFinite(ly)) {
            this.pendingLogoutSpawnTile = { x: Math.floor(lx), y: Math.floor(ly) };
        }
        else {
            this.pendingLogoutSpawnTile = null;
        }
        const rx = progress.respawnTileX;
        const ry = progress.respawnTileY;
        if (typeof rx === "number" &&
            Number.isFinite(rx) &&
            typeof ry === "number" &&
            Number.isFinite(ry)) {
            this.boundRespawnTile = { x: Math.floor(rx), y: Math.floor(ry) };
        }
        else {
            this.boundRespawnTile = null;
        }
        this.syncBoundRespawnToSerialized();
        if (progress.savedInventory != null) {
            const inv = coercePlayerInventoryPersistedPayload(progress.savedInventory);
            if (inv) {
                const hasWeaponBar = inv.weaponBar != null;
                this.getExt(Inventory).applyPersistedPayload(inv, { skipWeaponNotify: hasWeaponBar });
                if (hasWeaponBar && inv.weaponBar) {
                    const wb = inv.weaponBar;
                    this.serialized.set("inputInventoryItem", wb.inputInventoryItem);
                    this.serialized.set("weaponLoadoutPrimary", wb.weaponLoadoutPrimary);
                    this.serialized.set("weaponLoadoutSecondary", wb.weaponLoadoutSecondary);
                    this.serialized.set("weaponLoadoutMelee", wb.weaponLoadoutMelee);
                    this.serialized.set("activeWeaponLoadout", wb.activeWeaponLoadout);
                    this.sanitizeWeaponLoadouts();
                }
            }
        }
    }
    /** Full inventory snapshot for website persistence (bag, armor, weapon bar / loadouts). */
    getSavedInventoryPayload() {
        return Object.assign(Object.assign({}, this.getExt(Inventory).toPersistedPayload()), { weaponBar: {
                inputInventoryItem: this.serialized.get("inputInventoryItem"),
                weaponLoadoutPrimary: this.serialized.get("weaponLoadoutPrimary"),
                weaponLoadoutSecondary: this.serialized.get("weaponLoadoutSecondary"),
                weaponLoadoutMelee: this.serialized.get("weaponLoadoutMelee"),
                activeWeaponLoadout: this.serialized.get("activeWeaponLoadout"),
            } });
    }
    /**
     * Open world: consume one-time spawn tile from persisted progress (null if none or already consumed).
     */
    consumePendingLogoutSpawnTile() {
        const p = this.pendingLogoutSpawnTile;
        this.pendingLogoutSpawnTile = null;
        return p;
    }
    getQuestProgressPayload() {
        return parsePlayerQuestState(this.getSerialized().get("questStateJson"));
    }
    getTotalExperience() {
        var _a;
        return (_a = this.serialized.get("experience")) !== null && _a !== void 0 ? _a : 0;
    }
    getSkillAllocationRecord() {
        return {
            sprint: this.serialized.get("skillSprint") ? 1 : 0,
            regenerate: this.serialized.get("skillRegenerate") ? 1 : 0,
        };
    }
    getCharacterAllocationRecord() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return {
            health: (_a = this.serialized.get("statHealth")) !== null && _a !== void 0 ? _a : 0,
            evade: (_b = this.serialized.get("statEvade")) !== null && _b !== void 0 ? _b : 0,
            accuracy: (_c = this.serialized.get("statAccuracy")) !== null && _c !== void 0 ? _c : 0,
            reloadSpeed: (_d = this.serialized.get("statReloadSpeed")) !== null && _d !== void 0 ? _d : 0,
            runSpeed: (_e = this.serialized.get("statRunSpeed")) !== null && _e !== void 0 ? _e : 0,
            luck: (_f = this.serialized.get("statLuck")) !== null && _f !== void 0 ? _f : 0,
            stamina: (_g = this.serialized.get("statStamina")) !== null && _g !== void 0 ? _g : 0,
            recovery: (_h = this.serialized.get("statRecovery")) !== null && _h !== void 0 ? _h : 0,
            hpRecovery: (_j = this.serialized.get("statHpRecovery")) !== null && _j !== void 0 ? _j : 0,
            strength: (_k = this.serialized.get("statStrength")) !== null && _k !== void 0 ? _k : 0,
        };
    }
    applyDerivedStatsFromAllocations() {
        var _a, _b;
        const baseHp = getConfig().player.MAX_PLAYER_HEALTH;
        const maxHp = computeMaxPlayerHealth(baseHp, (_a = this.serialized.get("statHealth")) !== null && _a !== void 0 ? _a : 0);
        const d = this.getExt(Destructible);
        const cur = d.getHealth();
        d.setMaxHealth(maxHp);
        d.setHealth(Math.min(maxHp, Math.max(0, cur)));
        const baseSt = getConfig().player.MAX_STAMINA;
        const maxSt = computeMaxStamina(baseSt, (_b = this.serialized.get("statStamina")) !== null && _b !== void 0 ? _b : 0);
        const st = this.serialized.get("stamina");
        this.serialized.set("maxStamina", maxSt);
        this.serialized.set("stamina", Math.min(maxSt, st));
    }
    handleRegenerateHealing(deltaTime) {
        var _a;
        if (((_a = this.serialized.get("skillRegenerate")) !== null && _a !== void 0 ? _a : 0) <= 0) {
            return;
        }
        const d = this.getExt(Destructible);
        if (d.isDead()) {
            return;
        }
        d.heal(REGENERATE_HEAL_PER_SECOND * deltaTime);
    }
    handlePassiveHpRegen(deltaTime) {
        var _a;
        const d = this.getExt(Destructible);
        if (d.isDead()) {
            return;
        }
        if (d.getHealth() >= d.getMaxHealth()) {
            this.passiveHpRegenAccumulator = 0;
            return;
        }
        const pts = (_a = this.serialized.get("statHpRecovery")) !== null && _a !== void 0 ? _a : 0;
        const interval = computePassiveHpRegenIntervalSeconds(pts);
        this.passiveHpRegenAccumulator += deltaTime;
        while (this.passiveHpRegenAccumulator >= interval) {
            this.passiveHpRegenAccumulator -= interval;
            if (d.getHealth() >= d.getMaxHealth()) {
                break;
            }
            d.heal(CHARACTER_STAT_MODIFIERS.passiveHpRegenAmount);
        }
    }
    /** Max bag slots for this player (base config + strength). */
    getMaxInventorySlots() {
        var _a;
        return computeMaxInventorySlots(getConfig().player.MAX_INVENTORY_SLOTS, (_a = this.serialized.get("statStrength")) !== null && _a !== void 0 ? _a : 0);
    }
}
Player.PLAYER_WIDTH = getConfig().world.TILE_SIZE;
Player.INTERACT_COOLDOWN = getConfig().entity.PLAYER_INTERACT_COOLDOWN;
Player.PICKUP_HOLD_DURATION = getConfig().entity.PLAYER_PICKUP_HOLD_DURATION;
Player.RESPAWN_COOLDOWN_MS = getConfig().entity.PLAYER_RESPAWN_COOLDOWN_MS;
