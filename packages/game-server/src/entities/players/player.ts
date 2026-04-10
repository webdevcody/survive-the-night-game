import { PlayerDroppedItemEvent } from "../../../../game-shared/src/events/server-sent/events/player-dropped-item-event";
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
import { Broadcaster, IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import { Input } from "@shared/util/input";
import { InventoryItem, ItemType } from "@shared/util/inventory";
import { normalizeVector, distance } from "@shared/util/physics";
import { RecipeType } from "@shared/util/recipes";
import { Cooldown } from "@/entities/util/cooldown";
import { weaponHandlerRegistry } from "@/entities/weapons/weapon-handler-registry";
import { PlayerDeathEvent } from "../../../../game-shared/src/events/server-sent/events/player-death-event";
import { CraftEvent } from "../../../../game-shared/src/events/server-sent/events/craft-event";
import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import { getConfig } from "@shared/config";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { Rectangle } from "@/util/shape";
import Carryable from "@/extensions/carryable";
import { SkinType, SKIN_TYPES, PlayerColor, PLAYER_COLORS } from "@shared/commands/commands";
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
import { EntityType } from "@shared/types/entity";
import {
  CHARACTER_STAT_MODIFIERS,
  computeEncumbranceStaminaDrainMultiplier,
  computeInventoryWeightKg,
  computeMaxInventorySlots,
  computeMaxPlayerHealth,
  computeMaxStamina,
  computeEvadeChance,
  computePassiveHpRegenIntervalSeconds,
  computeStaminaRegenMultiplier,
} from "@shared/util/character-stats";
import { REGENERATE_HEAL_PER_SECOND } from "@shared/util/skill-tree";
import { getZombieTypesSet } from "@shared/constants";
import type { PersistedPlayerProgress } from "@/services/player-progress-types";
import { UserSessionCache } from "@/services/user-session-cache";
import { GAME_SERVER_API_KEY, WEBSITE_API_URL } from "@/config/env";
import { weaponRegistry } from "@shared/entities/weapon-registry";
import { itemMatchesLoadoutRow } from "@shared/util/weapon-loadout";
import { FISTS_INVENTORY_SENTINEL } from "@shared/constants/inventory-sentinel";
import {
  emptyPlayerQuestState,
  parsePlayerQuestState,
  stringifyPlayerQuestState,
  type PlayerQuestStatePayload,
} from "@shared/quests/player-quest-state";
import { initPlayerQuestState, tickWaypointSteps } from "@/quests/quest-runtime";

/**
 * Cached list of entity types that players can pass through (collision passthrough).
 * Includes player entity and all items configured with isPassthrough: true.
 * This is computed once at module load time for performance.
 */
const PASSTHROUGH_ENTITY_TYPES: EntityType[] = (() => {
  const passthroughTypes: EntityType[] = ["player"]; // Players can pass through other players

  // Add all items configured with isPassthrough: true
  itemRegistry.getAll().forEach((itemConfig) => {
    if (itemConfig.isPassthrough) {
      passthroughTypes.push(itemConfig.id as EntityType);
    }
  });

  return passthroughTypes;
})();

export class Player extends Entity {
  private static readonly PLAYER_WIDTH = getConfig().world.TILE_SIZE;
  private static readonly INTERACT_COOLDOWN = getConfig().entity.PLAYER_INTERACT_COOLDOWN;
  private static readonly PICKUP_HOLD_DURATION = getConfig().entity.PLAYER_PICKUP_HOLD_DURATION;
  private static readonly RESPAWN_COOLDOWN_MS = getConfig().entity.PLAYER_RESPAWN_COOLDOWN_MS;

  // Internal state
  private fireCooldown = new Cooldown(0.4, true);
  private interactCooldown = new Cooldown(Player.INTERACT_COOLDOWN, true);
  private zombieSpawnCooldown = new Cooldown(infectionConfig.ZOMBIE_SPAWN_COOLDOWN_MS / 1000, true); // Convert ms to seconds
  private broadcaster: Broadcaster;
  private lastWeaponType: ItemType | null = null;
  private exhaustionTimer: number = 0; // Time remaining before stamina can regenerate
  // Item pickup hold tracking
  private pickupHoldTimer: number = 0; // Time F has been held for pickup
  private targetPickupEntity: number | null = null; // Entity ID being targeted for pickup
  /** Accumulator for passive HP regen (hpRecovery stat). */
  private passiveHpRegenAccumulator = 0;
  /** Open world: restored from DB on connect; consumed when placing spawn. Not serialized. */
  private pendingLogoutSpawnTile: { x: number; y: number } | null = null;
  /**
   * Respawn tile from campsite-fire bind (hydrated from DB on connect; updated on interact).
   * Mirrored to `respawnBindTileX` / `respawnBindTileY` for the owning client UI.
   */
  private boundRespawnTile: { x: number; y: number } | null = null;
  /** Real-player client socket id (for website API persistence). AI players leave this null. */
  private clientSocketId: string | null = null;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.PLAYER);
    this.broadcaster = gameManagers.getBroadcaster();

    // Initialize serializable fields with default values
    // Input fields are stored individually for efficient serialization
    this.serialized = new SerializableFields(
      {
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
      },
      () => this.markEntityDirty(),
      {
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
      },
    );

    this.addExtension(new Inventory(this, gameManagers.getBroadcaster()));
    const poolManager = PoolManager.getInstance();
    const collidableSize = poolManager.vector2.claim(
      Player.PLAYER_WIDTH - 8,
      Player.PLAYER_WIDTH - 8,
    );
    const collidableOffset = poolManager.vector2.claim(4, 4);
    this.addExtension(new Collidable(this).setSize(collidableSize).setOffset(collidableOffset));
    const positionableSize = poolManager.vector2.claim(Player.PLAYER_WIDTH, Player.PLAYER_WIDTH);
    this.addExtension(new Positionable(this).setSize(positionableSize));
    this.addExtension(
      new Destructible(this)
        .setHealth(getConfig().player.MAX_PLAYER_HEALTH)
        .setMaxHealth(getConfig().player.MAX_PLAYER_HEALTH)
        .onBeforeDamage((damage, attackerId) => {
          if (attackerId !== undefined) {
            const attacker = this.getEntityManager().getEntityById(attackerId);
            if (attacker && getZombieTypesSet().has(attacker.getType() as any)) {
              const ev = this.serialized.get("statEvade") ?? 0;
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
        .onDeath(() => this.onDeath()),
    );
    this.addExtension(new Updatable(this, this.updatePlayer.bind(this)));
    this.addExtension(new Movable(this));
    this.addExtension(new Illuminated(this, getConfig().world.LIGHT_RADIUS_PLAYER));
    this.addExtension(new Groupable(this, "friendly"));

    this.applyWeaponLoadoutSelection();
  }

  get activeItem(): InventoryItem | null {
    return this.getExt(Inventory).getActiveItem(this.serialized.get("inputInventoryItem"));
  }

  setIsCrafting(isCrafting: boolean): void {
    this.serialized.set("isCrafting", isCrafting);
  }

  getIsCrafting(): boolean {
    return this.serialized.get("isCrafting");
  }

  isDead(): boolean {
    return this.getExt(Destructible).isDead();
  }

  isZombie(): boolean {
    return this.serialized.get("isZombie");
  }

  setIsZombie(value: boolean): void {
    this.serialized.set("isZombie", value);
    if (value) {
      this.serialized.set("skin", SKIN_TYPES.ZOMBIE);
    }
  }

  getHealth(): number {
    return this.getExt(Destructible).getHealth();
  }

  getMaxHealth(): number {
    return this.getExt(Destructible).getMaxHealth();
  }

  getDamageBox(): Rectangle {
    return this.getExt(Destructible).getDamageBox();
  }

  damage(damage: number): void {
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

  onDeath(): void {
    this.setIsCrafting(false);

    // In Battle Royale mode, drop all inventory items on death
    const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
    if (!strategy.getConfig().allowRespawn) {
      // Drop all items when respawning is disabled (Battle Royale)
      this.getExt(Inventory).scatterItems(this.getPosition());
    }

    this.serialized.set("deathTime", Date.now());
    this.broadcaster.broadcastEvent(
      new PlayerDeathEvent({
        playerId: this.getId(),
        displayName: this.getDisplayName(),
      }),
    );
    this.getExt(Collidable).setEnabled(false);
  }

  respawn(): void {
    if (!this.isDead()) return;

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
      const restored = mapManager.tryGetPositionForSavedTile(
        this.boundRespawnTile.x,
        this.boundRespawnTile.y,
      );
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

  setClientSocketId(socketId: string | null): void {
    this.clientSocketId = socketId;
  }

  getClientSocketId(): string | null {
    return this.clientSocketId;
  }

  getBoundRespawnTile(): { x: number; y: number } | null {
    return this.boundRespawnTile;
  }

  setBoundRespawnTile(tileX: number, tileY: number): void {
    this.boundRespawnTile = { x: tileX, y: tileY };
    this.syncBoundRespawnToSerialized();
    this.queuePersistRespawnBindToWebsite();
  }

  private syncBoundRespawnToSerialized(): void {
    if (!this.boundRespawnTile) {
      this.serialized.set("respawnBindTileX", -1);
      this.serialized.set("respawnBindTileY", -1);
      return;
    }
    this.serialized.set("respawnBindTileX", this.boundRespawnTile.x);
    this.serialized.set("respawnBindTileY", this.boundRespawnTile.y);
  }

  private queuePersistRespawnBindToWebsite(): void {
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
          console.warn(
            `[respawn-bind] HTTP ${res.status} for user ${userId}: ${t.slice(0, 300)}`,
          );
        }
      } catch (e) {
        console.warn(`[respawn-bind] failed for user ${userId}:`, e);
      }
    })();
  }

  private queueClearRespawnBindInDb(): void {
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
          console.warn(
            `[respawn-bind clear] HTTP ${res.status} for user ${userId}: ${t.slice(0, 300)}`,
          );
        }
      } catch (e) {
        console.warn(`[respawn-bind clear] failed for user ${userId}:`, e);
      }
    })();
  }

  getRespawnCooldownRemaining(): number {
    const deathTime = this.serialized.get("deathTime");
    if (deathTime === 0) return 0;
    const timeSinceDeath = Date.now() - deathTime;
    const remaining = Player.RESPAWN_COOLDOWN_MS - timeSinceDeath;
    return Math.max(0, remaining);
  }

  getDeathTime(): number {
    return this.serialized.get("deathTime");
  }

  setDeathTime(value: number): void {
    this.serialized.set("deathTime", value);
  }

  isInventoryFull(): boolean {
    return this.getExt(Inventory).isFull();
  }

  hasInInventory(key: ItemType): boolean {
    return this.getExt(Inventory).hasItem(key);
  }

  getCenterPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    return positionable.getCenterPosition();
  }

  getHitbox(): Rectangle {
    const collidable = this.getExt(Collidable);
    const hitbox = collidable.getHitBox();
    return hitbox;
  }

  getVelocity(): Vector2 {
    return this.getExt(Movable).getVelocity();
  }

  getPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    return positionable.getPosition();
  }

  getInventory(): (InventoryItem | null)[] {
    return this.getExt(Inventory).getItems();
  }

  clearInventory(): void {
    this.getExt(Inventory).clear();
  }

  private resolveAttackWeaponItem():
    | { kind: "fists" }
    | { kind: "weapon"; item: InventoryItem; bagIndex1Based: number } {
    const inv = this.getInventory();
    const max = this.getMaxInventorySlots();
    const lo = this.serialized.get("activeWeaponLoadout");
    const at = (idx: number) => (idx >= 1 && idx <= max ? inv[idx - 1] : null);

    if (lo === 0) {
      const idx = this.serialized.get("weaponLoadoutPrimary");
      if (idx < 1) return { kind: "fists" };
      const item = at(idx);
      if (!item || !itemMatchesLoadoutRow(item.itemType, 0)) return { kind: "fists" };
      return { kind: "weapon", item, bagIndex1Based: idx };
    }
    if (lo === 1) {
      const idx = this.serialized.get("weaponLoadoutSecondary");
      if (idx < 1) return { kind: "fists" };
      const item = at(idx);
      if (!item || !itemMatchesLoadoutRow(item.itemType, 1)) return { kind: "fists" };
      return { kind: "weapon", item, bagIndex1Based: idx };
    }
    if (lo === 2) {
      const idx = this.serialized.get("weaponLoadoutMelee");
      if (idx < 1) return { kind: "fists" };
      const item = at(idx);
      if (!item || !itemMatchesLoadoutRow(item.itemType, 2)) return { kind: "fists" };
      return { kind: "weapon", item, bagIndex1Based: idx };
    }
    return { kind: "fists" };
  }

  private performFistAttack(): void {
    const weaponKey = "fists";
    const cfg = weaponRegistry.get(weaponKey);
    const cooldown = cfg?.stats.cooldown ?? 0.85;
    if (this.fireCooldown === null || this.lastWeaponType !== weaponKey) {
      this.fireCooldown = new Cooldown(cooldown * this.getReloadCooldownMultiplier(), true);
      this.lastWeaponType = weaponKey as ItemType;
    }
    if (!this.fireCooldown.isReady()) return;
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
      damage: cfg?.stats.damage ?? 1,
      knockbackDistance: cfg?.stats.pushDistance,
      weaponKey,
      targetFilter: (entity, attackerId) => {
        return strategy.shouldDamageTarget(this, entity, attackerId);
      },
    });
  }

  /** Select primary (0), secondary (1), or melee (2) loadout — same as client SELECT_WEAPON_LOADOUT. */
  public selectWeaponLoadout(loadout: number): void {
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
  public assignWeaponLoadoutSlot(slot: number, bagIndex: number): void {
    const max = this.getMaxInventorySlots();
    const slotClamped = Math.max(0, Math.min(2, Math.floor(slot)));
    const bagIndexClamped = Math.max(0, Math.min(max, Math.floor(bagIndex)));
    const invExt = this.getExt(Inventory);
    const key =
      slotClamped === 0
        ? "weaponLoadoutPrimary"
        : slotClamped === 1
          ? "weaponLoadoutSecondary"
          : "weaponLoadoutMelee";

    if (bagIndexClamped === 0) {
      const prevRef = this.serialized.get(key) as number;
      if (prevRef >= 1 && prevRef <= max) {
        const inv = this.getInventory();
        let emptyIdx0: number | null = null;
        for (let i = 0; i < max; i++) {
          if (i === prevRef - 1) continue;
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
    if (!item) return;

    if (!itemMatchesLoadoutRow(item.itemType, slotClamped as 0 | 1 | 2)) return;

    const prevRef = this.serialized.get(key) as number;

    if (prevRef === bagIndexClamped) {
      this.applyWeaponLoadoutSelection();
      return;
    }

    if (prevRef === 0) {
      let emptyIdx0: number | null = null;
      for (let i = 0; i < max; i++) {
        if (inv[i] == null) {
          emptyIdx0 = i;
          break;
        }
      }
      if (emptyIdx0 !== null) {
        invExt.swapBagSlotsDeferWeaponResync(bagIndexClamped - 1, emptyIdx0);
        this.serialized.set(key, emptyIdx0 + 1);
      } else {
        this.serialized.set(key, bagIndexClamped);
      }
    } else {
      invExt.swapBagSlotsDeferWeaponResync(prevRef - 1, bagIndexClamped - 1);
    }

    this.sanitizeWeaponLoadouts();
  }

  public sanitizeWeaponLoadouts(): void {
    const inv = this.getInventory();
    const max = this.getMaxInventorySlots();
    const check = (key: "weaponLoadoutPrimary" | "weaponLoadoutSecondary" | "weaponLoadoutMelee") => {
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
      if (!itemMatchesLoadoutRow(item.itemType, row)) this.serialized.set(key, 0);
    };
    check("weaponLoadoutPrimary");
    check("weaponLoadoutSecondary");
    check("weaponLoadoutMelee");
    this.applyWeaponLoadoutSelection();
  }

  public applyWeaponLoadoutSelection(): void {
    const lo = this.serialized.get("activeWeaponLoadout");
    const max = this.getMaxInventorySlots();
    const inv = this.getInventory();
    const at = (idx: number) => (idx >= 1 && idx <= max ? inv[idx - 1] : null);

    if (lo === 0) {
      const idx = this.serialized.get("weaponLoadoutPrimary");
      if (idx >= 1 && idx <= max && at(idx) && itemMatchesLoadoutRow(at(idx)!.itemType, 0)) {
        this.selectInventoryItemOnly(idx);
        return;
      }
      this.selectInventoryItemOnly(FISTS_INVENTORY_SENTINEL);
      return;
    }
    if (lo === 1) {
      const idx = this.serialized.get("weaponLoadoutSecondary");
      if (idx >= 1 && idx <= max && at(idx) && itemMatchesLoadoutRow(at(idx)!.itemType, 1)) {
        this.selectInventoryItemOnly(idx);
        return;
      }
      this.selectInventoryItemOnly(FISTS_INVENTORY_SENTINEL);
      return;
    }
    if (lo === 2) {
      const idx = this.serialized.get("weaponLoadoutMelee");
      if (idx >= 1 && idx <= max && at(idx) && itemMatchesLoadoutRow(at(idx)!.itemType, 2)) {
        this.selectInventoryItemOnly(idx);
        return;
      }
      this.selectInventoryItemOnly(FISTS_INVENTORY_SENTINEL);
      return;
    }
  }

  getActiveWeapon(): InventoryItem | null {
    const resolved = this.resolveAttackWeaponItem();
    if (resolved.kind === "weapon") return resolved.item;
    return null;
  }

  setPosition(position: Vector2) {
    this.getExt(Positionable).setPosition(position);
  }

  craftRecipe(recipe: RecipeType): void {
    const inventory = this.getExt(Inventory);
    const originalInventoryJson = JSON.stringify(inventory.getItems());
    const result = inventory.craftRecipe(recipe);

    // Check if crafting succeeded (inventory changed or item was dropped)
    const inventoryChanged = JSON.stringify(inventory.getItems()) !== originalInventoryJson;
    const craftingSucceeded = inventoryChanged || result.itemToDrop !== undefined;

    // If inventory was full, drop the crafted item on the ground
    if (result.itemToDrop) {
      const entity = this.getEntityManager()?.createEntityFromItem(result.itemToDrop);
      if (entity) {
        const position = this.getExt(Positionable).getPosition();
        // Add small random offset so it doesn't spawn exactly on the player
        const offset = 20;
        const theta = Math.random() * 2 * Math.PI;
        const poolManager = PoolManager.getInstance();
        const pos = poolManager.vector2.claim(
          position.x + offset * Math.cos(theta),
          position.y + offset * Math.sin(theta),
        );

        if ("setPosition" in entity) {
          (entity as any).setPosition(pos);
        } else if (entity.hasExt(Positionable)) {
          entity.getExt(Positionable).setPosition(pos);
        }

        this.getEntityManager()?.addEntity(entity);
      }
    }

    // Broadcast craft event if crafting succeeded
    if (craftingSucceeded) {
      this.getGameManagers().getBroadcaster().broadcastEvent(new CraftEvent(this.getId()));
    }

    this.setIsCrafting(false);
  }

  handleAttack(deltaTime: number) {
    this.fireCooldown.update(deltaTime);

    if (!this.serialized.get("inputFire")) return;

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
        } else {
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
        this.fireCooldown = new Cooldown(
          customHandler.cooldown * this.getReloadCooldownMultiplier(),
          true,
        );
        this.lastWeaponType = weaponType;
      }

      if (this.fireCooldown.isReady()) {
        this.fireCooldown.reset();
        customHandler.handler(
          weaponEntity as Entity,
          this.getId(),
          this.getCenterPosition().clone(),
          this.serialized.get("inputFacing"),
          this.serialized.get("inputAimAngle"),
          inventoryIndex,
        );
        weaponEntity.clearDirtyFlags();
      }
      return;
    }

    if (!(weaponEntity instanceof Weapon)) {
      return;
    }

    if (this.fireCooldown === null || this.lastWeaponType !== weaponType) {
      this.fireCooldown = new Cooldown(
        weaponEntity.getCooldown() * this.getReloadCooldownMultiplier(),
        true,
      );
      this.lastWeaponType = weaponType;
    }

    if (this.fireCooldown.isReady()) {
      this.fireCooldown.reset();
      weaponEntity.attack(
        this.getId(),
        this.getCenterPosition().clone(),
        this.serialized.get("inputFacing"),
        this.serialized.get("inputAimAngle"),
        this.serialized.get("inputAimDistance"),
      );
      weaponEntity.clearDirtyFlags();
    }
  }

  private handleZombieClawAttack(): void {
    // Set cooldown for zombie claw attack if not already set
    if (this.lastWeaponType !== "zombie_claw") {
      this.fireCooldown = new Cooldown(getConfig().combat.ZOMBIE_PLAYER_CLAW_COOLDOWN, true);
      this.lastWeaponType = "zombie_claw" as ItemType;
    }

    if (!this.fireCooldown.isReady()) return;
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
        if (entity.getId() === attackerId) return false;
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

  handleMovement(deltaTime: number) {
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
    const currentSpeed = Math.sqrt(
      currentVelocity.x * currentVelocity.x + currentVelocity.y * currentVelocity.y,
    );
    if (currentSpeed < getConfig().player.PLAYER_SPEED * 2) {
      // Set velocity based on current input
      const poolManager = PoolManager.getInstance();
      const inputDx = this.serialized.get("inputDx");
      const inputDy = this.serialized.get("inputDy");
      if (inputDx === 0 && inputDy === 0) {
        movable.setVelocity(poolManager.vector2.claim(0, 0));
      } else {
        const inputVec = poolManager.vector2.claim(inputDx, inputDy);
        const normalized = normalizeVector(inputVec);

        // Check if infinite run extension is active
        const hasInfiniteRun = this.hasExt(InfiniteRun);

        const isZombie = this.serialized.get("isZombie");

        const stamina = this.serialized.get("stamina");
        const hasSprintSkill = (this.serialized.get("skillSprint") ?? 0) > 0;
        const canSprint =
          !isZombie &&
          hasSprintSkill &&
          this.serialized.get("inputSprint") &&
          (hasInfiniteRun || (stamina > 0 && this.exhaustionTimer <= 0));
        const sprintMultiplier = canSprint ? getConfig().player.SPRINT_MULTIPLIER : 1;

        // Apply zombie speed reduction (70% speed)
        const zombieMultiplier = isZombie ? getConfig().player.ZOMBIE_SPEED_MULTIPLIER : 1;
        const runStat = this.serialized.get("statRunSpeed") ?? 0;
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

        movable.setVelocity(
          poolManager.vector2.claim(
            normalized.x * getConfig().player.PLAYER_SPEED * speedMultiplier,
            normalized.y * getConfig().player.PLAYER_SPEED * speedMultiplier,
          ),
        );
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

  setDisplayName(displayName: string): void {
    this.serialized.set("displayName", displayName);
  }

  getDisplayName(): string {
    return this.serialized.get("displayName");
  }

  handleStamina(deltaTime: number) {
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
      const isSprinting =
        this.serialized.get("inputSprint") && isMoving && (hasInfiniteRun || stamina > 0);

      // Regenerate stamina when not sprinting
      if (!isSprinting) {
        const oldStamina = stamina;
        const recMult = computeStaminaRegenMultiplier(this.serialized.get("statRecovery") ?? 0);
        const newStamina = Math.min(
          maxStamina,
          stamina + getConfig().player.STAMINA_REGEN_RATE * recMult * deltaTime,
        );
        this.serialized.set("stamina", newStamina);

        if (Math.abs(oldStamina - newStamina) > 0.01) {
          this.serialized.set("maxStamina", maxStamina);
        }
      }
    }
  }

  private handleAutoPickup(): void {
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

  private updatePlayer(deltaTime: number) {
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

  private updateZombieSpawnCooldown(deltaTime: number): void {
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

  private updateLighting() {
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
        if (itemConfig?.lightIntensity) {
          totalLightIntensity += itemConfig.lightIntensity;
        }
      }
    }

    illuminated.setRadius(totalLightIntensity);
  }

  setInput(input: Input) {
    // Map input object to individual serialized fields
    this.serialized.set("inputFacing", input.facing ?? Direction.Right);
    this.serialized.set("inputDx", input.dx ?? 0);
    this.serialized.set("inputDy", input.dy ?? 0);
    this.serialized.set("inputFire", input.fire ?? false);
    this.serialized.set("inputSprint", input.sprint ?? false);
    this.serialized.set("inputAimAngle", input.aimAngle ?? NaN); // NaN represents undefined
    this.serialized.set("inputAimDistance", input.aimDistance ?? NaN); // NaN represents undefined
  }

  selectInventoryItemOnly(index: number): void {
    const previousSlot = this.serialized.get("inputInventoryItem");
    this.serialized.set("inputInventoryItem", index);

    if (previousSlot !== index) {
      const inventory = this.getExt(Inventory);
      this.markExtensionDirty(inventory);
    }
  }

  selectInventoryItem(index: number) {
    this.selectInventoryItemOnly(index);
    if (index === FISTS_INVENTORY_SENTINEL) {
      return;
    }
    const p = this.serialized.get("weaponLoadoutPrimary");
    const s = this.serialized.get("weaponLoadoutSecondary");
    const m = this.serialized.get("weaponLoadoutMelee");
    if (index === p) this.serialized.set("activeWeaponLoadout", 0);
    else if (index === s) this.serialized.set("activeWeaponLoadout", 1);
    else if (index === m) this.serialized.set("activeWeaponLoadout", 2);
  }

  setAsFiring(firing: boolean) {
    this.serialized.set("inputFire", firing);
  }

  heal(amount: number): void {
    this.getExt(Destructible).heal(amount);
  }

  update(deltaTime: number): void {
    if (this.isDead()) {
      return;
    }
  }

  setSkin(skin: SkinType): void {
    this.serialized.set("skin", skin);
  }

  getSkin(): SkinType {
    return this.serialized.get("skin");
  }

  setPlayerColor(color: PlayerColor): void {
    this.serialized.set("playerColor", color);
  }

  getPlayerColor(): PlayerColor {
    return this.serialized.get("playerColor");
  }

  incrementKills() {
    const currentKills = this.serialized.get("kills") || 0;
    this.serialized.set("kills", currentKills + 1);
  }

  getKills(): number {
    return this.serialized.get("kills") || 0;
  }

  setPing(ping: number): void {
    this.serialized.set("ping", ping);
  }

  getPing(): number {
    return this.serialized.get("ping");
  }

  // Zombie spawn cooldown methods
  isZombieSpawnReady(): boolean {
    return this.zombieSpawnCooldown.isReady();
  }

  resetZombieSpawnCooldown(): void {
    this.zombieSpawnCooldown.reset();
    this.serialized.set("zombieSpawnCooldownProgress", 0);
  }

  setZombieSpawnReady(): void {
    this.zombieSpawnCooldown.setAsReady();
    this.serialized.set("zombieSpawnCooldownProgress", 1);
  }

  getZombieSpawnCooldownProgress(): number {
    return this.serialized.get("zombieSpawnCooldownProgress");
  }

  getReloadCooldownMultiplier(): number {
    const r = this.serialized.get("statReloadSpeed") ?? 0;
    return Math.max(
      0.5,
      1 - r * CHARACTER_STAT_MODIFIERS.reloadSpeedCooldownReductionPerPoint,
    );
  }

  /** Multiplier on bullet spread / aim error (lower = more accurate). */
  getAccuracySpreadMultiplier(): number {
    const acc = this.serialized.get("statAccuracy") ?? 0;
    return Math.max(0.2, 1 - acc * CHARACTER_STAT_MODIFIERS.accuracySpreadReductionPerPoint);
  }

  /** Extra coins when picking up coin entities (luck stat). */
  getLuckCoinPickupBonus(): number {
    const luck = this.serialized.get("statLuck") ?? 0;
    return Math.min(3, Math.floor(luck / 4));
  }

  /**
   * Apply skill + character allocation maps from DB (normalized keys, values 0+).
   */
  applyPersistedProgress(
    skillAllocations: Record<string, number>,
    characterAllocations: Record<string, number>,
  ): void {
    const sprint = Math.min(1, Math.floor(skillAllocations.sprint ?? 0));
    const regen = Math.min(1, Math.floor(skillAllocations.regenerate ?? 0));
    this.serialized.set("skillSprint", sprint);
    this.serialized.set("skillRegenerate", regen);

    const rawAlloc = characterAllocations as Record<string, number>;
    const evadeRaw = rawAlloc.evade ?? rawAlloc.defence ?? 0;
    this.serialized.set("statHealth", Math.min(99, Math.floor(characterAllocations.health ?? 0)));
    this.serialized.set("statEvade", Math.min(99, Math.floor(evadeRaw)));
    this.serialized.set("statAccuracy", Math.min(99, Math.floor(characterAllocations.accuracy ?? 0)));
    this.serialized.set(
      "statReloadSpeed",
      Math.min(99, Math.floor(characterAllocations.reloadSpeed ?? 0)),
    );
    this.serialized.set("statRunSpeed", Math.min(99, Math.floor(characterAllocations.runSpeed ?? 0)));
    this.serialized.set("statLuck", Math.min(99, Math.floor(characterAllocations.luck ?? 0)));
    this.serialized.set("statStamina", Math.min(99, Math.floor(characterAllocations.stamina ?? 0)));
    this.serialized.set("statRecovery", Math.min(99, Math.floor(characterAllocations.recovery ?? 0)));
    this.serialized.set(
      "statHpRecovery",
      Math.min(99, Math.floor(characterAllocations.hpRecovery ?? 0)),
    );
    this.serialized.set("statStrength", Math.min(99, Math.floor(characterAllocations.strength ?? 0)));

    this.applyDerivedStatsFromAllocations();
  }

  /** Called when connecting with persisted website data (keeps fields encapsulated). */
  hydratePersistedProgress(progress: PersistedPlayerProgress): void {
    this.serialized.set("experience", Math.max(0, Math.floor(progress.experience)));
    this.applyPersistedProgress(progress.skillAllocations, progress.characterAllocations);
    initPlayerQuestState(this, progress.questProgress);
    const lx = progress.lastTileX;
    const ly = progress.lastTileY;
    if (
      typeof lx === "number" &&
      Number.isFinite(lx) &&
      typeof ly === "number" &&
      Number.isFinite(ly)
    ) {
      this.pendingLogoutSpawnTile = { x: Math.floor(lx), y: Math.floor(ly) };
    } else {
      this.pendingLogoutSpawnTile = null;
    }

    const rx = progress.respawnTileX;
    const ry = progress.respawnTileY;
    if (
      typeof rx === "number" &&
      Number.isFinite(rx) &&
      typeof ry === "number" &&
      Number.isFinite(ry)
    ) {
      this.boundRespawnTile = { x: Math.floor(rx), y: Math.floor(ry) };
    } else {
      this.boundRespawnTile = null;
    }
    this.syncBoundRespawnToSerialized();
  }

  /**
   * Open world: consume one-time spawn tile from persisted progress (null if none or already consumed).
   */
  consumePendingLogoutSpawnTile(): { x: number; y: number } | null {
    const p = this.pendingLogoutSpawnTile;
    this.pendingLogoutSpawnTile = null;
    return p;
  }

  getQuestProgressPayload(): PlayerQuestStatePayload {
    return parsePlayerQuestState(this.getSerialized().get("questStateJson"));
  }

  getTotalExperience(): number {
    return this.serialized.get("experience") ?? 0;
  }

  getSkillAllocationRecord(): Record<string, number> {
    return {
      sprint: this.serialized.get("skillSprint") ? 1 : 0,
      regenerate: this.serialized.get("skillRegenerate") ? 1 : 0,
    };
  }

  getCharacterAllocationRecord(): Record<string, number> {
    return {
      health: this.serialized.get("statHealth") ?? 0,
      evade: this.serialized.get("statEvade") ?? 0,
      accuracy: this.serialized.get("statAccuracy") ?? 0,
      reloadSpeed: this.serialized.get("statReloadSpeed") ?? 0,
      runSpeed: this.serialized.get("statRunSpeed") ?? 0,
      luck: this.serialized.get("statLuck") ?? 0,
      stamina: this.serialized.get("statStamina") ?? 0,
      recovery: this.serialized.get("statRecovery") ?? 0,
      hpRecovery: this.serialized.get("statHpRecovery") ?? 0,
      strength: this.serialized.get("statStrength") ?? 0,
    };
  }

  applyDerivedStatsFromAllocations(): void {
    const baseHp = getConfig().player.MAX_PLAYER_HEALTH;
    const maxHp = computeMaxPlayerHealth(baseHp, this.serialized.get("statHealth") ?? 0);
    const d = this.getExt(Destructible);
    const cur = d.getHealth();
    d.setMaxHealth(maxHp);
    d.setHealth(Math.min(maxHp, Math.max(0, cur)));

    const baseSt = getConfig().player.MAX_STAMINA;
    const maxSt = computeMaxStamina(baseSt, this.serialized.get("statStamina") ?? 0);
    const st = this.serialized.get("stamina");
    this.serialized.set("maxStamina", maxSt);
    this.serialized.set("stamina", Math.min(maxSt, st));
  }

  private handleRegenerateHealing(deltaTime: number): void {
    if ((this.serialized.get("skillRegenerate") ?? 0) <= 0) {
      return;
    }
    const d = this.getExt(Destructible);
    if (d.isDead()) {
      return;
    }
    d.heal(REGENERATE_HEAL_PER_SECOND * deltaTime);
  }

  private handlePassiveHpRegen(deltaTime: number): void {
    const d = this.getExt(Destructible);
    if (d.isDead()) {
      return;
    }
    if (d.getHealth() >= d.getMaxHealth()) {
      this.passiveHpRegenAccumulator = 0;
      return;
    }
    const pts = this.serialized.get("statHpRecovery") ?? 0;
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
  getMaxInventorySlots(): number {
    return computeMaxInventorySlots(
      getConfig().player.MAX_INVENTORY_SLOTS,
      this.serialized.get("statStrength") ?? 0,
    );
  }

  // Base class already handles isDirty and clearDirtyFlags with the dirty fields set
}
