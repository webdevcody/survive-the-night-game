import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { Input } from "@shared/util/input";
import { InventoryItem, ItemType } from "@shared/util/inventory";
import { RecipeType } from "@shared/util/recipes";
import Vector2 from "@/util/vector2";
import { Rectangle } from "@/util/shape";
import { SkinType, PlayerColor } from "@shared/commands/commands";
import type { PersistedPlayerProgress } from "@/services/player-progress-types";
import { type PlayerQuestStatePayload } from "@shared/quests/player-quest-state";
export declare class Player extends Entity {
    private static readonly PLAYER_WIDTH;
    private static readonly INTERACT_COOLDOWN;
    private static readonly PICKUP_HOLD_DURATION;
    private static readonly RESPAWN_COOLDOWN_MS;
    private fireCooldown;
    private interactCooldown;
    private zombieSpawnCooldown;
    private broadcaster;
    private lastWeaponType;
    private exhaustionTimer;
    private pickupHoldTimer;
    private targetPickupEntity;
    /** Accumulator for passive HP regen (hpRecovery stat). */
    private passiveHpRegenAccumulator;
    /** Open world: restored from DB on connect; consumed when placing spawn. Not serialized. */
    private pendingLogoutSpawnTile;
    /**
     * Respawn tile from campsite-fire bind (hydrated from DB on connect; updated on interact).
     * Mirrored to `respawnBindTileX` / `respawnBindTileY` for the owning client UI.
     */
    private boundRespawnTile;
    /** Real-player client socket id (for website API persistence). AI players leave this null. */
    private clientSocketId;
    constructor(gameManagers: IGameManagers);
    get activeItem(): InventoryItem | null;
    setIsCrafting(isCrafting: boolean): void;
    getIsCrafting(): boolean;
    isDead(): boolean;
    isZombie(): boolean;
    setIsZombie(value: boolean): void;
    getHealth(): number;
    getMaxHealth(): number;
    getDamageBox(): Rectangle;
    damage(damage: number): void;
    onDeath(): void;
    respawn(): void;
    setClientSocketId(socketId: string | null): void;
    getClientSocketId(): string | null;
    getBoundRespawnTile(): {
        x: number;
        y: number;
    } | null;
    setBoundRespawnTile(tileX: number, tileY: number): void;
    private syncBoundRespawnToSerialized;
    private queuePersistRespawnBindToWebsite;
    private queueClearRespawnBindInDb;
    getRespawnCooldownRemaining(): number;
    getDeathTime(): number;
    setDeathTime(value: number): void;
    isInventoryFull(): boolean;
    hasInInventory(key: ItemType): boolean;
    getCenterPosition(): Vector2;
    getHitbox(): Rectangle;
    getVelocity(): Vector2;
    getPosition(): Vector2;
    getInventory(): (InventoryItem | null)[];
    clearInventory(): void;
    private resolveAttackWeaponItem;
    private performFistAttack;
    /** Select primary (0), secondary (1), or melee (2) loadout — same as client SELECT_WEAPON_LOADOUT. */
    selectWeaponLoadout(loadout: number): void;
    /**
     * Assign a bag slot to a weapon loadout (0 = clear). Validates item type per slot.
     * Same rules as SET_WEAPON_LOADOUT_SLOT from clients.
     * When equipping, moves/swaps bag items so the clicked slot is cleared when possible:
     * - empty loadout: move weapon to first empty cell and point loadout there (source cleared);
     *   if the bag is full, only the loadout pointer is set (legacy).
     * - loadout already set: swap clicked cell with the loadout's backing cell (ref unchanged).
     * When clearing, move the hidden backing weapon to the earliest empty visible bag cell if one exists.
     */
    assignWeaponLoadoutSlot(slot: number, bagIndex: number): void;
    sanitizeWeaponLoadouts(): void;
    applyWeaponLoadoutSelection(): void;
    getActiveWeapon(): InventoryItem | null;
    setPosition(position: Vector2): void;
    craftRecipe(recipe: RecipeType): void;
    handleAttack(deltaTime: number): void;
    private handleZombieClawAttack;
    handleMovement(deltaTime: number): void;
    setDisplayName(displayName: string): void;
    getDisplayName(): string;
    handleStamina(deltaTime: number): void;
    private handleAutoPickup;
    private updatePlayer;
    private updateZombieSpawnCooldown;
    private updateLighting;
    setInput(input: Input): void;
    selectInventoryItemOnly(index: number): void;
    selectInventoryItem(index: number): void;
    setAsFiring(firing: boolean): void;
    heal(amount: number): void;
    update(deltaTime: number): void;
    setSkin(skin: SkinType): void;
    getSkin(): SkinType;
    setPlayerColor(color: PlayerColor): void;
    getPlayerColor(): PlayerColor;
    incrementKills(): void;
    getKills(): number;
    setPing(ping: number): void;
    getPing(): number;
    isZombieSpawnReady(): boolean;
    resetZombieSpawnCooldown(): void;
    setZombieSpawnReady(): void;
    getZombieSpawnCooldownProgress(): number;
    getReloadCooldownMultiplier(): number;
    /** Multiplier on bullet spread / aim error (lower = more accurate). */
    getAccuracySpreadMultiplier(): number;
    /** Extra coins when picking up coin entities (luck stat). */
    getLuckCoinPickupBonus(): number;
    /**
     * Apply skill + character allocation maps from DB (normalized keys, values 0+).
     */
    applyPersistedProgress(skillAllocations: Record<string, number>, characterAllocations: Record<string, number>): void;
    /** Called when connecting with persisted website data (keeps fields encapsulated). */
    hydratePersistedProgress(progress: PersistedPlayerProgress): void;
    /**
     * Open world: consume one-time spawn tile from persisted progress (null if none or already consumed).
     */
    consumePendingLogoutSpawnTile(): {
        x: number;
        y: number;
    } | null;
    getQuestProgressPayload(): PlayerQuestStatePayload;
    getTotalExperience(): number;
    getSkillAllocationRecord(): Record<string, number>;
    getCharacterAllocationRecord(): Record<string, number>;
    applyDerivedStatsFromAllocations(): void;
    private handleRegenerateHealing;
    private handlePassiveHpRegen;
    /** Max bag slots for this player (base config + strength). */
    getMaxInventorySlots(): number;
}
