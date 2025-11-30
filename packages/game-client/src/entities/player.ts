import { animate } from "@/animations";
import {
  ClientDestructible,
  ClientPositionable,
  ClientMovable,
  ClientIgnitable,
  ClientInventory,
  ClientResourcesBag,
  ClientCollidable,
} from "@/extensions";
import { ImageLoader, getItemAssetKey } from "@/managers/asset";
import { GameState } from "@/state";
import { debugDrawHitbox, drawCenterPositionWithLabel } from "@/util/debug";
import { createFlashEffect } from "@/util/render";
import { Z_INDEX } from "@shared/map";
import { Direction, normalizeDirection } from "../../../game-shared/src/util/direction";
import { Hitbox } from "../../../game-shared/src/util/hitbox";
import { Input } from "../../../game-shared/src/util/input";
import { InventoryItem } from "../../../game-shared/src/util/inventory";
import { itemRegistry } from "@shared/entities";
import { roundVector2, distance } from "../../../game-shared/src/util/physics";
import { RawEntity } from "@shared/types/entity";
import { IClientEntity, Renderable, getFrameIndex, drawHealthBar } from "@/entities/util";
import { getConfig } from "@shared/config";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { ClientEntity } from "./client-entity";
import { SKIN_TYPES, SkinType, PLAYER_COLORS, PlayerColor } from "@shared/commands/commands";
import { getDebugConfig } from "@/config/client-prediction";
import { BufferReader } from "@shared/util/buffer-serialization";

export class PlayerClient extends ClientEntity implements IClientEntity, Renderable {
  private readonly ARROW_LENGTH = 20;
  private readonly SPRINT_ANIMATION_DURATION = 400;
  private readonly WALK_ANIMATION_DURATION = 450;

  private lastRenderPosition = { x: 0, y: 0 };
  private isCrafting = false;
  private previousHealth: number | undefined;
  private damageFlashUntil: number = 0;
  private skin: SkinType = SKIN_TYPES.DEFAULT;
  private playerColor: PlayerColor = PLAYER_COLORS.NONE;
  private kills: number = 0;
  private ping: number = 0;
  private displayName: string = "";
  private stamina: number = 100;
  private maxStamina: number = 100;
  private pickupProgress: number = 0; // Client-only field for interact hold progress
  private serverGhostPos: Vector2 | null = null;
  private deathTime: number = 0; // Timestamp when player died, 0 means not dead
  private isAI: boolean = false; // Whether this player is controlled by AI
  private aiState: string = ""; // Current AI state (for debugging)
  private isZombie: boolean = false; // Whether this player has become a zombie (Battle Royale)
  private zombieSpawnCooldownProgress: number = 1; // 0-1 progress for zombie spawn ability (1 = ready)

  private input: Input = {
    facing: Direction.Right,
    dx: 0,
    dy: 0,
    fire: false,
    sprint: false,
  };

  public getZIndex(): number {
    return Z_INDEX.PLAYERS;
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
    };
    this.skin = data.skin || SKIN_TYPES.DEFAULT;
    this.playerColor = data.playerColor || PLAYER_COLORS.NONE;
    this.kills = data.kills || 0;
    this.ping = data.ping || 0;
    this.displayName = data.displayName || "Unknown";
    this.stamina = data.stamina ?? 100;
    this.maxStamina = data.maxStamina ?? 100;
    this.pickupProgress = data.pickupProgress ?? 0;
    this.deathTime = data.deathTime ?? 0;
    this.isAI = (data as any).isAI ?? false;
    this.aiState = (data as any).aiState ?? "";
    this.isZombie = (data as any).isZombie ?? false;
    this.zombieSpawnCooldownProgress = (data as any).zombieSpawnCooldownProgress ?? 1;
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
    // Update skin if it was changed (e.g., when converted to zombie)
    if ((this as any).skin !== undefined) {
      this.skin = (this as any).skin;
    }
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

  getInventory(): InventoryItem[] {
    if (this.hasExt(ClientInventory)) {
      return this.getExt(ClientInventory).getItems();
    }
    return [];
  }

  getSelectedInventorySlot(): number {
    // inputInventoryItem is 1-indexed (1-10), convert to 0-indexed (0-9)
    const slot = (this as any).inputInventoryItem ?? 1;
    return slot - 1;
  }

  getInput(): Input {
    return this.input;
  }

  setInput(input: Input): void {
    this.input = input;
  }

  getIsCrafting(): boolean {
    return this.isCrafting;
  }

  getMaxHealth(): number {
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
    const { facing } = this.input;
    const isMoving = this.getVelocity().x !== 0 || this.getVelocity().y !== 0;

    let image: HTMLImageElement;
    const assetKey = this.getPlayerAssetKey();

    if (this.isDead()) {
      image = this.imageLoader.getWithDirection(assetKey, Direction.Down);
    } else if (!isMoving) {
      image = this.imageLoader.getWithDirection(assetKey, facing);
    } else {
      // Faster animation when sprinting
      const animationDuration = this.input.sprint
        ? this.SPRINT_ANIMATION_DURATION
        : this.WALK_ANIMATION_DURATION;
      const frameIndex = getFrameIndex(gameState.startedAt, {
        duration: animationDuration,
        frames: 3,
      });
      image = this.imageLoader.getFrameWithDirection(assetKey, facing, frameIndex);
    }
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

      // Render miners-hat overlay if in inventory
      this.renderMinersHat(ctx, renderPosition);

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

  renderMinersHat(ctx: CanvasRenderingContext2D, renderPosition: Vector2) {
    // Check for any wearable items in inventory - render the first one found
    const wearableItem = this.getInventory().find((item) => {
      if (item === null) return false;
      const itemConfig = itemRegistry.get(item.itemType);
      return itemConfig?.wearable === true;
    });

    if (wearableItem) {
      const wearableImage = this.imageLoader.get(wearableItem.itemType);
      ctx.drawImage(wearableImage, renderPosition.x, renderPosition.y);
    }
  }

  public setLocalInventorySlot(slot: number): void {
    // This method is called when server updates the slot
    // The slot is already set via deserializeProperty for inputInventoryItem
    // No need to update input object since inventoryItem is no longer in Input
  }

  renderInventoryItem(ctx: CanvasRenderingContext2D, renderPosition: Vector2) {
    const activeItem = this.getActiveItem();
    if (activeItem === null || activeItem === undefined) {
      return;
    }

    // Ensure activeItem has a valid itemType
    if (!activeItem.itemType) {
      return;
    }

    // Skip rendering held item if it's a wearable item (should show as overlay instead)
    const itemConfig = itemRegistry.get(activeItem.itemType);
    if (itemConfig?.hideWhenSelected) {
      return; // Don't render as held item - it's worn and shown as overlay
    }

    const { facing } = this.input;
    // Ensure facing is never undefined - fallback to Right if missing
    const direction = facing ?? Direction.Right;
    const image = this.imageLoader.getWithDirection(getItemAssetKey(activeItem), direction);
    ctx.drawImage(image, renderPosition.x + 2, renderPosition.y);
  }

  public getKills(): number {
    return this.kills;
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
    if (this.hasExt(ClientResourcesBag)) {
      return this.getExt(ClientResourcesBag).getCoins();
    }
    return 0;
  }

  public getWood(): number {
    if (this.hasExt(ClientResourcesBag)) {
      return this.getExt(ClientResourcesBag).getWood();
    }
    return 0;
  }

  public getCloth(): number {
    if (this.hasExt(ClientResourcesBag)) {
      return this.getExt(ClientResourcesBag).getCloth();
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

    const inventory = this.getExt(ClientInventory).getItems();
    // Validate slot is within inventory bounds
    if (inputInventoryItem < 1 || inputInventoryItem > inventory.length) {
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
