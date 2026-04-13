import { animate } from "@/animations";
import {
  ClientDestructible,
  ClientPositionable,
  ClientMovable,
  ClientIgnitable,
  ClientInventory,
  ClientCollidable,
  ClientBank,
} from "@/extensions";
import { ImageLoader, getItemAssetKey } from "@/managers/asset";
import { GameState } from "@/state";
import { debugDrawHitbox, drawCenterPositionWithLabel } from "@/util/debug";
import { renderRadialProgressIndicator } from "@/util/radial-progress-indicator";
import { createFlashEffect } from "@/util/render";
import { Z_INDEX } from "@shared/map";
import { Direction, normalizeDirection } from "../../../game-shared/src/util/direction";
import { Hitbox } from "../../../game-shared/src/util/hitbox";
import { Input } from "../../../game-shared/src/util/input";
import {
  InventoryItem,
  getWeaponAmmoType,
  getWeaponMagazineSize,
  isWeapon,
} from "../../../game-shared/src/util/inventory";
import { getPlayerBodyOverlayItemsInRenderOrder } from "@shared/util/player-body-overlays";
import { resolveAttackWeaponFromLoadout } from "@shared/util/weapon-loadout";
import { itemRegistry } from "@shared/entities";
import { roundVector2, distance } from "../../../game-shared/src/util/physics";
import { RawEntity } from "@shared/types/entity";
import { IClientEntity, Renderable, getFrameIndex, drawHealthBar } from "@/entities/util";
import { getConfig, playerConfig } from "@shared/config";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { ClientEntity } from "./client-entity";
import { SKIN_TYPES, SkinType, PLAYER_COLORS, PlayerColor } from "@shared/commands/commands";
import { getDebugConfig } from "@/config/client-prediction";
import { BufferReader } from "@shared/util/buffer-serialization";
import {
  sumCharacterAllocations,
  computeMaxInventorySlots,
} from "@shared/util/character-stats";
import {
  ABILITY_IDS,
  ABILITY_SERIALIZED_FIELD_BY_ID,
  type AbilityId,
  emptyAbilityAllocations,
  sumAbilityAllocations,
} from "@shared/util/ability-tree";
import { getProgressionPointsBudget } from "@shared/util/experience-level";
import { FISTS_INVENTORY_SENTINEL } from "@shared/constants/inventory-sentinel";
import {
  parsePlayerQuestState,
  type PlayerQuestStatePayload,
} from "@shared/quests/player-quest-state";
import {
  emptyProfessionProgress,
  getProfessionDetails,
  getProfessionLevelFromXp,
  normalizeProfessionProgress,
  type ProfessionId,
  type ProfessionProgress,
} from "@shared/util/professions";
import {
  getAccessibleInventorySlotCount,
  getUnlockedVisibleBagSlots,
  isSneakActive,
} from "@shared/util/ability-effects";

export class PlayerClient extends ClientEntity implements IClientEntity, Renderable {
  private readonly ARROW_LENGTH = 20;
  private readonly SPRINT_ANIMATION_DURATION = 400;
  private readonly WALK_ANIMATION_DURATION = 450;

  private lastRenderPosition: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private isCrafting = false;
  private previousHealth: number | undefined;
  private damageFlashUntil: number = 0;
  private skin: SkinType = SKIN_TYPES.DEFAULT;
  private playerColor: PlayerColor = PLAYER_COLORS.NONE;
  private kills: number = 0;
  private experience: number = 0;
  private ping: number = 0;
  private displayName: string = "";
  private stamina: number = playerConfig.MAX_STAMINA;
  private maxStamina: number = playerConfig.MAX_STAMINA;
  private pickupProgress: number = 0; // Client-only field for interact hold progress
  private serverGhostPos: Vector2 | null = null;
  private deathTime: number = 0; // Timestamp when player died, 0 means not dead
  private isAI: boolean = false; // Whether this player is controlled by AI
  private aiState: string = ""; // Current AI state (for debugging)
  private isZombie: boolean = false; // Whether this player has become a zombie (Battle Royale)
  private zombieSpawnCooldownProgress: number = 1; // 0-1 progress for zombie spawn ability (1 = ready)
  private isReloading: boolean = false;
  private reloadProgress: number = 0;
  /** Client-only: per loadout row (primary / secondary / melee), same timing as melee radial. */
  private weaponLoadoutCooldownStartedAt: [number, number, number] = [0, 0, 0];
  private weaponLoadoutCooldownMs: [number, number, number] = [0, 0, 0];

  private abilityRanks: Record<AbilityId, number> = emptyAbilityAllocations();
  private professionProgress: ProfessionProgress = emptyProfessionProgress();
  private statHealth: number = 0;
  private statEvade: number = 0;
  private statAccuracy: number = 0;
  private statReloadSpeed: number = 0;
  private statRunSpeed: number = 0;
  private statLuck: number = 0;
  private statStamina: number = 0;
  private statRecovery: number = 0;
  private statHpRecovery: number = 0;
  private statStrength: number = 0;

  private input: Input = {
    facing: Direction.Right,
    dx: 0,
    dy: 0,
    fire: false,
    sprint: false,
    sneak: false,
  };

  public getZIndex(): number {
    return Z_INDEX.PLAYERS;
  }

  /** Tile indices for campsite-fire respawn bind; unset when no bind. */
  getRespawnBindTile(): { x: number; y: number } | null {
    const x = (this as any).respawnBindTileX as number | undefined;
    const y = (this as any).respawnBindTileY as number | undefined;
    if (typeof x === "number" && typeof y === "number") {
      return { x, y };
    }
    return null;
  }

  constructor(data: RawEntity, imageLoader: ImageLoader) {
    super(data, imageLoader);
    this.isCrafting = data.isCrafting;
    // Ensure input is always defined, fallback to default if missing
    this.input = data.input || {
      facing: Direction.Right,
      dx: 0,
      dy: 0,
      fire: false,
      sprint: false,
      sneak: false,
    };
    this.skin = data.skin || SKIN_TYPES.DEFAULT;
    this.playerColor = data.playerColor || PLAYER_COLORS.NONE;
    this.kills = data.kills || 0;
    this.experience = (data as any).experience ?? 0;
    this.ping = data.ping || 0;
    this.displayName = data.displayName || "Unknown";
    this.stamina = data.stamina ?? playerConfig.MAX_STAMINA;
    this.maxStamina = data.maxStamina ?? playerConfig.MAX_STAMINA;
    this.pickupProgress = data.pickupProgress ?? 0;
    this.deathTime = data.deathTime ?? 0;
    this.isAI = (data as any).isAI ?? false;
    this.aiState = (data as any).aiState ?? "";
    this.isZombie = (data as any).isZombie ?? false;
    this.zombieSpawnCooldownProgress = (data as any).zombieSpawnCooldownProgress ?? 1;
    this.isReloading = Boolean((data as any).isReloading);
    this.reloadProgress = Number((data as any).reloadProgress) || 0;
    this.syncProgressionFromData(data as any);
  }

  private syncProgressionFromData(data: Record<string, unknown>): void {
    const nextAbilityRanks = emptyAbilityAllocations();
    for (const abilityId of ABILITY_IDS) {
      const serializedField = ABILITY_SERIALIZED_FIELD_BY_ID[abilityId];
      const legacyField =
        abilityId === "sprint"
          ? "skillSprint"
          : abilityId === "regenerate"
            ? "skillRegenerate"
            : undefined;
      nextAbilityRanks[abilityId] = Number(
        data[serializedField] ?? (legacyField ? data[legacyField] : undefined),
      ) || 0;
    }
    this.abilityRanks = nextAbilityRanks;
    const rawProfessionProgress = (data as any).professionProgressJson;
    if (typeof rawProfessionProgress === "string" && rawProfessionProgress.trim() !== "") {
      try {
        this.professionProgress = normalizeProfessionProgress(JSON.parse(rawProfessionProgress));
      } catch {
        this.professionProgress = emptyProfessionProgress();
      }
    } else {
      this.professionProgress = emptyProfessionProgress();
    }
    this.statHealth = Number(data.statHealth) || 0;
    this.statEvade = Number((data as any).statEvade ?? (data as any).statDefence) || 0;
    this.statAccuracy = Number(data.statAccuracy) || 0;
    this.statReloadSpeed = Number(data.statReloadSpeed) || 0;
    this.statRunSpeed = Number(data.statRunSpeed) || 0;
    this.statLuck = Number(data.statLuck) || 0;
    this.statStamina = Number((data as any).statStamina) || 0;
    this.statRecovery = Number((data as any).statRecovery) || 0;
    this.statHpRecovery = Number((data as any).statHpRecovery) || 0;
    this.statStrength = Number((data as any).statStrength) || 0;
  }

  public deserializeFromBuffer(reader: BufferReader): void {
    super.deserializeFromBuffer(reader);
    // Update fields from deserialized data
    // Note: super.deserializeFromBuffer sets fields directly on (this as any)[fieldName]
    // so we need to read them and sync to our private fields
    this.isAI = (this as any).isAI ?? false;
    this.aiState = (this as any).aiState ?? "";
    this.isZombie = (this as any).isZombie ?? false;
    this.zombieSpawnCooldownProgress = (this as any).zombieSpawnCooldownProgress ?? 1;
    this.isReloading = Boolean((this as any).isReloading);
    this.reloadProgress = Number((this as any).reloadProgress) || 0;
    this.experience = (this as any).experience ?? 0;
    this.syncProgressionFromData(this as any);
    // Update skin if it was changed (e.g., when converted to zombie)
    if ((this as any).skin !== undefined) {
      this.skin = (this as any).skin;
    }
  }

  public getQuestProgressPayload(): PlayerQuestStatePayload {
    return parsePlayerQuestState((this as any).questStateJson);
  }

  public isZombiePlayer(): boolean {
    return this.isZombie;
  }

  public getZombieSpawnCooldownProgress(): number {
    return this.zombieSpawnCooldownProgress;
  }

  private getPlayerAssetKey(): string {
    // Zombie players use zombie skin (regular zombie walk animation)
    // Read isZombie from deserialized data as fallback (in case it hasn't been synced yet)
    const isZombie = this.isZombie || (this as any).isZombie || false;
    const skin = this.skin || (this as any).skin;
    if (isZombie || skin === SKIN_TYPES.ZOMBIE) {
      return "grave_tyrant"; // Use regular zombie sprite for zombie players
    }

    const baseSkin = this.skin === SKIN_TYPES.WDC ? "player_wdc" : "player";
    // If player has a color, append it to the asset key
    if (this.playerColor && this.playerColor !== PLAYER_COLORS.NONE) {
      return `${baseSkin}_${this.playerColor}`;
    }
    return baseSkin;
  }

  public getPlayerColor(): PlayerColor {
    return this.playerColor;
  }

  getInventory(): (InventoryItem | null)[] {
    if (this.hasExt(ClientInventory)) {
      return this.getExt(ClientInventory).getItems();
    }
    return [];
  }

  getBankItems(): (InventoryItem | null)[] {
    if (this.hasExt(ClientBank)) {
      return this.getExt(ClientBank).getItems();
    }
    return [];
  }

  getSelectedInventorySlot(): number {
    const raw = (this as any).inputInventoryItem ?? 1;
    if (raw === FISTS_INVENTORY_SENTINEL) return -1;
    return raw - 1;
  }

  getInput(): Input {
    return this.input;
  }

  setInput(input: Input): void {
    this.input = input;
  }

  /**
   * Matches server Player.isSneaking: Sneak ability + sneak input, not a zombie.
   * Local player uses live input; others use serialized inputSneak.
   */
  isSneaking(gameState: GameState): boolean {
    const isSneakInputActive =
      gameState.playerId === this.getId()
        ? Boolean(this.input.sneak)
        : Boolean((this as any).inputSneak);

    return isSneakActive({
      isZombie: this.isZombie,
      hasSneakAbility: this.hasAbility("sneak"),
      isSneakInputActive,
    });
  }

  private getCurrentRenderImage(gameState: GameState): HTMLImageElement {
    const { facing } = this.input;
    const isMoving = this.getVelocity().x !== 0 || this.getVelocity().y !== 0;
    const assetKey = this.getPlayerAssetKey();

    if (this.isDead()) {
      return this.imageLoader.getWithDirection(assetKey, Direction.Down);
    }
    if (!isMoving) {
      return this.imageLoader.getWithDirection(assetKey, facing);
    }

    const animationDuration = this.input.sprint
      ? this.SPRINT_ANIMATION_DURATION
      : this.WALK_ANIMATION_DURATION;
    const frameIndex = getFrameIndex(gameState.startedAt, {
      duration: animationDuration,
      frames: 3,
    });
    return this.imageLoader.getFrameWithDirection(assetKey, facing, frameIndex);
  }

  private getCurrentRenderBounds(gameState: GameState): { x: number; y: number; w: number; h: number } {
    const image = this.getCurrentRenderImage(gameState);
    return {
      x: Math.round(this.lastRenderPosition.x),
      y: Math.round(this.lastRenderPosition.y),
      w: image.width,
      h: image.height,
    };
  }

  /** Drawn after the night/darkness overlay so the icon stays visible. */
  public renderSneakStatusAfterDarkness(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.isSneaking(gameState) || this.isDead()) {
      return;
    }
    const { x, y, w, h } = this.getCurrentRenderBounds(gameState);
    const icon = this.imageLoader.get("icon_sneak_closed");
    const ix = Math.round(x + w / 2 - icon.width / 2);
    const iy = Math.round(y + h);
    ctx.drawImage(icon, ix, iy);
  }

  getIsCrafting(): boolean {
    return this.isCrafting;
  }

  getMaxHealth(): number {
    if (this.hasExt(ClientDestructible)) {
      return this.getExt(ClientDestructible).getMaxHealth();
    }
    return getConfig().player.MAX_PLAYER_HEALTH;
  }

  isDead(): boolean {
    if (!this.hasExt(ClientDestructible)) {
      return false;
    }
    return this.getExt(ClientDestructible).isDead();
  }

  getPosition(): Vector2 {
    if (!this.hasExt(ClientPositionable)) {
      console.warn(`Player ${this.getId()} missing ClientPositionable extension`);
      return PoolManager.getInstance().vector2.claim(0, 0);
    }
    const positionable = this.getExt(ClientPositionable);
    return positionable.getPosition();
  }

  setPosition(position: Vector2): void {
    if (!this.hasExt(ClientPositionable)) {
      console.warn(`Player ${this.getId()} missing ClientPositionable extension`);
      return;
    }
    const positionable = this.getExt(ClientPositionable);
    positionable.setPosition(position);
  }

  getCenterPosition(): Vector2 {
    if (!this.hasExt(ClientPositionable)) {
      // Fallback: return zero vector if positionable is missing
      console.warn(`Player ${this.getId()} missing ClientPositionable extension`);
      return PoolManager.getInstance().vector2.claim(0, 0);
    }
    const positionable = this.getExt(ClientPositionable);
    return positionable.getCenterPosition();
  }

  getVelocity(): Vector2 {
    if (!this.hasExt(ClientMovable)) {
      console.warn(`Player ${this.getId()} missing ClientMovable extension`);
      return PoolManager.getInstance().vector2.claim(0, 0);
    }
    const movable = this.getExt(ClientMovable);
    return movable.getVelocity();
  }

  setServerGhostPosition(pos: Vector2 | null): void {
    const poolManager = PoolManager.getInstance();
    this.serverGhostPos = pos ? poolManager.vector2.claim(pos.x, pos.y) : null;
  }

  getDamageBox(): Hitbox {
    // Use collidable if available, otherwise fall back to positionable
    if (this.hasExt(ClientCollidable)) {
      const collidable = this.getExt(ClientCollidable);
      return collidable.getHitBox();
    }
    // Fallback: use positionable size for damage box
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const size = positionable.getSize();
    return {
      x: position.x,
      y: position.y,
      width: size.x,
      height: size.y,
    };
  }

  getHealth(): number {
    if (!this.hasExt(ClientDestructible)) {
      console.warn(`Player ${this.getId()} does not have destructible extension`);
      return 0;
    }
    return this.getExt(ClientDestructible).getHealth();
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const currentHealth = this.getHealth();

    if (this.previousHealth !== undefined && currentHealth < this.previousHealth) {
      this.damageFlashUntil = Date.now() + 250;
    }
    this.previousHealth = currentHealth;

    const targetPosition = this.getPosition();
    const image = this.getCurrentRenderImage(gameState);
    const dist = distance(targetPosition, this.lastRenderPosition);

    if (dist > 100) {
      this.lastRenderPosition.x = targetPosition.x;
      this.lastRenderPosition.y = targetPosition.y;
    } else {
      this.lastRenderPosition = this.lerpPosition(
        targetPosition,
        PoolManager.getInstance().vector2.claim(
          this.lastRenderPosition.x,
          this.lastRenderPosition.y
        ),
        gameState.dt
      );
    }

    const poolManager = PoolManager.getInstance();
    const renderPosition = roundVector2(
      poolManager.vector2.claim(this.lastRenderPosition.x, this.lastRenderPosition.y)
    );

    ctx.save();

    if (this.isDead()) {
      ctx.globalAlpha = 0.7;
      ctx.translate(renderPosition.x, renderPosition.y);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.drawImage(image, renderPosition.x, renderPosition.y);

      // Equipped armor / wearables (body overlays), not bag-only items
      this.renderEquippedBodyOverlays(ctx, renderPosition);

      if (this.hasExt(ClientIgnitable)) {
        const frameIndex = getFrameIndex(gameState.startedAt, {
          duration: 500,
          frames: 5,
        });
        const fireImg = this.imageLoader.getFrameIndex("flame", frameIndex);
        ctx.drawImage(fireImg, renderPosition.x, renderPosition.y);
      }

      this.renderInventoryItem(ctx, renderPosition);
    }

    if (Date.now() < this.damageFlashUntil) {
      const flashEffect = createFlashEffect(image);
      ctx.drawImage(flashEffect, renderPosition.x, renderPosition.y);
    }

    // Draw ghost position if available (server authoritative position)
    // Only render if debug mode is enabled
    if (getDebugConfig().showServerGhost && this.serverGhostPos) {
      const ghost = this.serverGhostPos;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(image, Math.round(ghost.x), Math.round(ghost.y));
      ctx.restore();
    }

    ctx.restore();

    // if (!this.isDead()) {
    //   this.renderArrow(ctx, image, renderPosition);
    // }

    drawHealthBar(ctx, renderPosition, this.getHealth(), this.getMaxHealth());

    debugDrawHitbox(ctx, this.getDamageBox(), "red");

    drawCenterPositionWithLabel(ctx, this.getCenterPosition());

    const isLocalPlayer = gameState.playerId === this.getId();

    if (this.displayName && !isLocalPlayer) {
      ctx.save();
      ctx.font = "4px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      const nameX = renderPosition.x + image.width / 2;
      const nameY = renderPosition.y - 6;
      ctx.fillText(this.displayName, nameX, nameY);
      ctx.restore();
    }

    // Render AI state above head if enabled (controlled by server-side DEBUG_SHOW_AI_STATE flag)
    if (this.isAI && this.aiState && !isLocalPlayer) {
      ctx.save();
      ctx.font = "3px Arial";
      ctx.fillStyle = this.getAIStateColor(this.aiState);
      ctx.textAlign = "center";
      const stateX = renderPosition.x + image.width / 2;
      const stateY = renderPosition.y - (this.displayName ? 12 : 6); // Position above name if name exists
      ctx.fillText(this.aiState, stateX, stateY);
      ctx.restore();
    }

    if (this.isCrafting) {
      ctx.font = "8px Arial";
      const animatedPosition = animate(gameState.startedAt, renderPosition, {
        duration: 2000,
        frames: {
          0: PoolManager.getInstance().vector2.claim(0, 0),
          50: PoolManager.getInstance().vector2.claim(0, 5),
        },
      });
      ctx.fillText("🔧", animatedPosition.x + 3, animatedPosition.y - 6);
    }
  }

  public getDisplayName(): string {
    return this.displayName;
  }

  public getIsAI(): boolean {
    return this.isAI;
  }

  /**
   * Get color for AI state display
   */
  private getAIStateColor(state: string): string {
    switch (state) {
      case "ENGAGE":
        return "#ff0000"; // Red for combat
      case "RETREAT":
        return "#ffff00"; // Yellow for retreating
      case "LOOT":
        return "#00ff00"; // Green for looting
      case "HUNT":
        return "#00aaff"; // Blue for hunting
      case "EXPLORE":
        return "#ffffff"; // White for exploring
      default:
        return "#00ff00"; // Default to green
    }
  }

  renderArrow(ctx: CanvasRenderingContext2D, image: HTMLImageElement, renderPosition: Vector2) {
    const { facing } = this.input;
    const direction = normalizeDirection(facing);

    if (direction === null) {
      return;
    }

    const arrowStart = {
      x: renderPosition.x + image.width / 2,
      y: renderPosition.y + image.height / 2,
    };

    const arrowEnd = {
      x: arrowStart.x + direction.x * this.ARROW_LENGTH,
      y: arrowStart.y + direction.y * this.ARROW_LENGTH,
    };

    const arrowColor = "white";

    const headLength = 5;
    const angle = Math.atan2(direction.y, direction.x);

    ctx.beginPath();
    ctx.moveTo(arrowEnd.x, arrowEnd.y);
    ctx.lineTo(
      arrowEnd.x - headLength * Math.cos(angle - Math.PI / 6),
      arrowEnd.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      arrowEnd.x - headLength * Math.cos(angle + Math.PI / 6),
      arrowEnd.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = arrowColor;
    ctx.fill();
  }

  renderEquippedBodyOverlays(ctx: CanvasRenderingContext2D, renderPosition: Vector2) {
    if (!this.hasExt(ClientInventory)) return;
    const equipment = this.getExt(ClientInventory).getEquipment();
    for (const item of getPlayerBodyOverlayItemsInRenderOrder(equipment)) {
      const img = this.imageLoader.get(getItemAssetKey(item));
      ctx.drawImage(img, renderPosition.x, renderPosition.y);
    }
  }

  public renderReloadProgressIndicator(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.isReloading || this.reloadProgress <= 0 || this.isDead()) {
      return;
    }

    const renderPosition = this.getCurrentRenderBounds(gameState);
    const isLocalPlayer = gameState.playerId === this.getId();
    let indicatorY = renderPosition.y - 6;
    if (!isLocalPlayer && this.displayName) {
      indicatorY -= 6;
    }
    if (!isLocalPlayer && this.isAI && this.aiState) {
      indicatorY -= 6;
    }

    renderRadialProgressIndicator(ctx, {
      progress: this.reloadProgress,
      x: renderPosition.x + 8,
      y: indicatorY,
      radius: 6,
      progressColor: "rgba(255, 214, 102, 0.95)",
      borderColor: "rgba(255, 246, 214, 0.85)",
      borderWidth: 1.25,
      backgroundColor: "rgba(18, 12, 8, 0.72)",
    });
  }

  public setLocalInventorySlot(slot: number): void {
    // This method is called when server updates the slot
    // The slot is already set via deserializeProperty for inputInventoryItem
    // No need to update input object since inventoryItem is no longer in Input
  }

  /**
   * Weapon from the active loadout row (same rules as server combat), or null if fists / invalid.
   */
  public getResolvedLoadoutWeaponItem(): InventoryItem | null {
    if (!this.hasExt(ClientInventory)) return null;
    const inv = this.getInventory();
    const max = this.getMaxInventorySlots();
    const p = (this as any).weaponLoadoutPrimary ?? 0;
    const s = (this as any).weaponLoadoutSecondary ?? 0;
    const m = (this as any).weaponLoadoutMelee ?? 0;
    const lo = (this as any).activeWeaponLoadout ?? 0;
    return resolveAttackWeaponFromLoadout(inv, max, lo, p, s, m)?.item ?? null;
  }

  public isReloadingWeapon(): boolean {
    return this.isReloading;
  }

  public getReloadProgress(): number {
    return this.reloadProgress;
  }

  public startWeaponLoadoutCooldown(loadoutRow: 0 | 1 | 2, cooldownSeconds: number): void {
    const durationMs = Math.max(0, cooldownSeconds * 1000);
    if (durationMs <= 0) {
      this.weaponLoadoutCooldownStartedAt[loadoutRow] = 0;
      this.weaponLoadoutCooldownMs[loadoutRow] = 0;
      return;
    }
    this.weaponLoadoutCooldownStartedAt[loadoutRow] = Date.now();
    this.weaponLoadoutCooldownMs[loadoutRow] = durationMs;
  }

  public getWeaponLoadoutCooldownProgress(loadoutRow: 0 | 1 | 2): number {
    if (this.isDead()) {
      return 0;
    }
    const startedAt = this.weaponLoadoutCooldownStartedAt[loadoutRow];
    const durationMs = this.weaponLoadoutCooldownMs[loadoutRow];
    if (startedAt <= 0 || durationMs <= 0) {
      return 0;
    }

    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs <= 0 || elapsedMs >= durationMs) {
      return 0;
    }

    return Math.max(0, Math.min(1, elapsedMs / durationMs));
  }

  public getActiveWeaponAmmoState():
    | { clip: number; reserve: number; magazineSize: number }
    | null {
    if (!this.hasExt(ClientInventory)) {
      return null;
    }

    const activeItem = this.getActiveItem();
    if (!activeItem || !isWeapon(activeItem.itemType)) {
      return null;
    }

    const ammoType = getWeaponAmmoType(activeItem.itemType);
    const magazineSize = getWeaponMagazineSize(activeItem.itemType);
    if (!ammoType || magazineSize == null) {
      return null;
    }

    const rawLoadedAmmo = activeItem.state?.loadedAmmo;
    const clip =
      typeof rawLoadedAmmo === "number" && Number.isFinite(rawLoadedAmmo)
        ? Math.max(0, Math.min(magazineSize, Math.floor(rawLoadedAmmo)))
        : magazineSize;

    return {
      clip,
      reserve: this.getExt(ClientInventory).getTotalCount(ammoType),
      magazineSize,
    };
  }

  /** Held sprite: non-weapons from selected bag slot; weapons only from loadout. */
  private getHeldItemForRender(): InventoryItem | null {
    const inputInventoryItem = (this as any).inputInventoryItem;
    if (inputInventoryItem === undefined || inputInventoryItem === null) {
      return null;
    }
    if (inputInventoryItem === FISTS_INVENTORY_SENTINEL) {
      return null;
    }
    if (!this.hasExt(ClientInventory)) {
      return null;
    }
    const bagItem = this.getExt(ClientInventory).getActiveItem(inputInventoryItem);
    if (!bagItem) {
      return null;
    }
    if (!isWeapon(bagItem.itemType)) {
      return bagItem;
    }
    return this.getResolvedLoadoutWeaponItem();
  }

  renderInventoryItem(ctx: CanvasRenderingContext2D, renderPosition: Vector2) {
    const activeItem = this.getHeldItemForRender();
    if (activeItem === null || activeItem === undefined) {
      return;
    }

    if (!activeItem.itemType) {
      return;
    }

    if (activeItem.itemType === "fists") {
      return;
    }

    const itemConfig = itemRegistry.get(activeItem.itemType);
    if (itemConfig?.hideWhenSelected) {
      return;
    }

    const { facing } = this.input;
    const direction = facing ?? Direction.Right;
    const image = this.imageLoader.getWithDirection(getItemAssetKey(activeItem), direction);
    ctx.drawImage(image, renderPosition.x + 2, renderPosition.y);
  }

  public getKills(): number {
    return this.kills;
  }

  /** Total experience from the server (synced on game state updates). */
  public getTotalExperience(): number {
    return this.experience;
  }

  public getAvailableAbilityPoints(): number {
    const budget = getProgressionPointsBudget(this.experience);
    const spent = sumAbilityAllocations(this.abilityRanks);
    return Math.max(0, budget - spent);
  }

  public getAvailableSkillPoints(): number {
    return this.getAvailableAbilityPoints();
  }

  public getAvailableCharacterPoints(): number {
    const budget = getProgressionPointsBudget(this.experience);
    const spent = sumCharacterAllocations({
      health: this.statHealth,
      evade: this.statEvade,
      accuracy: this.statAccuracy,
      reloadSpeed: this.statReloadSpeed,
      runSpeed: this.statRunSpeed,
      luck: this.statLuck,
      stamina: this.statStamina,
      recovery: this.statRecovery,
      hpRecovery: this.statHpRecovery,
      strength: this.statStrength,
    });
    return Math.max(0, budget - spent);
  }

  public getAbilityRank(abilityId: AbilityId): number {
    return this.abilityRanks[abilityId] ?? 0;
  }

  public hasAbility(abilityId: AbilityId): boolean {
    return this.getAbilityRank(abilityId) > 0;
  }

  public getAbilityAllocationRecord(): Record<AbilityId, number> {
    return { ...this.abilityRanks };
  }

  public getAbilitySprintRank(): number {
    return this.getAbilityRank("sprint");
  }

  public getAbilityRegenerateRank(): number {
    return this.getAbilityRank("regenerate");
  }

  public getSkillSprintRank(): number {
    return this.getAbilitySprintRank();
  }

  public getSkillRegenerateRank(): number {
    return this.getAbilityRegenerateRank();
  }

  public getProfessionProgressRecord(): ProfessionProgress {
    return { ...this.professionProgress };
  }

  public getProfessionLevel(professionId: ProfessionId): number {
    return getProfessionLevelFromXp(this.professionProgress[professionId] ?? 0);
  }

  public getProfessionDetails(professionId: ProfessionId) {
    return getProfessionDetails(professionId, this.professionProgress);
  }

  public getCharacterStat(stat: string): number {
    switch (stat) {
      case "health":
        return this.statHealth;
      case "evade":
        return this.statEvade;
      case "accuracy":
        return this.statAccuracy;
      case "reloadSpeed":
        return this.statReloadSpeed;
      case "runSpeed":
        return this.statRunSpeed;
      case "luck":
        return this.statLuck;
      case "stamina":
        return this.statStamina;
      case "recovery":
        return this.statRecovery;
      case "hpRecovery":
        return this.statHpRecovery;
      case "strength":
        return this.statStrength;
      default:
        return 0;
    }
  }

  /** Bag slot cap (matches server strength bonus). */
  public getMaxInventorySlots(): number {
    return computeMaxInventorySlots(
      getConfig().player.MAX_INVENTORY_SLOTS,
      this.statStrength,
    );
  }

  public getAccessibleInventorySlotCount(): number {
    return getAccessibleInventorySlotCount(this.getMaxInventorySlots(), this.abilityRanks);
  }

  public getUnlockedVisibleBagSlotCount(): number {
    return getUnlockedVisibleBagSlots(this.getMaxInventorySlots(), this.abilityRanks);
  }

  public isInventorySlotLocked(bagIndex0: number): boolean {
    return bagIndex0 >= this.getAccessibleInventorySlotCount();
  }

  public getPing(): number {
    return this.ping;
  }

  public getStamina(): number {
    return this.stamina;
  }

  public getMaxStamina(): number {
    return this.maxStamina;
  }

  public getCoins(): number {
    if (this.hasExt(ClientInventory)) {
      return this.getExt(ClientInventory).getTotalCount("coin");
    }
    return 0;
  }

  public getWood(): number {
    if (this.hasExt(ClientInventory)) {
      return this.getExt(ClientInventory).getTotalCount("wood");
    }
    return 0;
  }

  public getCloth(): number {
    if (this.hasExt(ClientInventory)) {
      return this.getExt(ClientInventory).getTotalCount("cloth");
    }
    return 0;
  }

  public getActiveItem(): InventoryItem | null {
    // Get inputInventoryItem from server (1-indexed: 1-10)
    // If not set, return null instead of defaulting to slot 1
    // This prevents showing wrong item when server hasn't synced yet
    const inputInventoryItem = (this as any).inputInventoryItem;
    if (inputInventoryItem === undefined || inputInventoryItem === null) {
      return null;
    }

    if (!this.hasExt(ClientInventory)) {
      console.warn(`Player ${this.getId()} missing ClientInventory extension`);
      return null;
    }

    if (inputInventoryItem === FISTS_INVENTORY_SENTINEL) {
      return { itemType: "fists" as const, state: {} };
    }

    const maxSlots = this.getMaxInventorySlots();
    if (inputInventoryItem < 1 || inputInventoryItem > maxSlots) {
      return null;
    }

    return this.getExt(ClientInventory).getActiveItem(inputInventoryItem);
  }

  private reconstructInputObject(): void {
    // Reconstruct input object from individual serialized fields
    const inputAimAngle = (this as any).inputAimAngle;
    const input: Input = {
      facing: (this as any).inputFacing ?? Direction.Right,
      dx: (this as any).inputDx ?? 0,
      dy: (this as any).inputDy ?? 0,
      fire: (this as any).inputFire ?? false,
      sprint: (this as any).inputSprint ?? false,
      sneak: (this as any).inputSneak ?? false,
      // NaN represents undefined for aimAngle
      aimAngle: inputAimAngle === undefined || isNaN(inputAimAngle) ? undefined : inputAimAngle,
    };

    // Preserve locally-calculated facing direction for cursor-based aiming
    const previousFacing = this.input?.facing;
    this.input = input;
    if (previousFacing !== undefined) {
      this.input.facing = previousFacing;
    }
  }

  getDeathTime(): number {
    return this.deathTime;
  }

  getRespawnCooldownRemaining(): number {
    if (this.deathTime === 0) return 0;
    const RESPAWN_COOLDOWN_MS = 5000; // 5 seconds
    const timeSinceDeath = Date.now() - this.deathTime;
    const remaining = RESPAWN_COOLDOWN_MS - timeSinceDeath;
    return Math.max(0, remaining);
  }

  getPickupProgress(): number {
    return this.pickupProgress;
  }
}
