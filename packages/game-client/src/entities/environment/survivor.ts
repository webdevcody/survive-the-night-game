import { RawEntity } from "@shared/types/entity";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import {
  ClientPositionable,
  ClientMovable,
  ClientDestructible,
  ClientInteractive,
} from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { getFrameIndex, drawHealthBar } from "@/entities/util";
import { determineDirection, Direction, angleToDirection } from "@shared/util/direction";
import { roundVector2 } from "@shared/util/physics";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@shared/config";
import { getPlayer } from "@/util/get-player";
import { renderInteractionText } from "@/util/interaction-text";
import { InventoryItem } from "@shared/util/inventory";

const SURVIVOR_WALK_ANIMATION_DURATION = 450;
const SURVIVOR_MOVEMENT_EPSILON = 0.5; // Increased to prevent animation during pause periods
const SURVIVOR_MAX_HEALTH = 10; // Must match server-side constant

function isMoving(vector: Vector2): boolean {
  return (
    Math.abs(vector.x) > SURVIVOR_MOVEMENT_EPSILON || Math.abs(vector.y) > SURVIVOR_MOVEMENT_EPSILON
  );
}

function getVectorMagnitudeSquared(vector: Vector2): number {
  return vector.x * vector.x + vector.y * vector.y;
}

function resolveFacingFromVector(vector: Vector2, fallback: Direction): Direction {
  if (!isMoving(vector)) {
    return fallback;
  }

  const primaryDirection = determineDirection(vector);
  if (primaryDirection !== null) {
    return primaryDirection;
  }

  // Fall back to angle-based direction for diagonal movement
  return angleToDirection(Math.atan2(vector.y, vector.x));
}

export class SurvivorClient extends ClientEntity implements Renderable {
  private lastRenderPosition = { x: 0, y: 0 };
  private previousHealth: number | undefined;
  private damageFlashUntil: number = 0;
  private isRescued: boolean = false;
  private lastFacing: Direction = Direction.Down;
  private hasRenderedOnce: boolean = false;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.isRescued = data.isRescued || false;
  }

  public deserialize(data: RawEntity): void {
    super.deserialize(data);
    if (data.isRescued !== undefined) {
      this.isRescued = data.isRescued;
      // Initialize facing direction when rescued
      if (this.isRescued && this.lastFacing === Direction.Down) {
        const velocity = this.getVelocity();
        const velocityDirection = determineDirection(velocity);
        if (velocityDirection) {
          this.lastFacing = velocityDirection;
        }
      }
    }
  }

  public deserializeProperty(key: string, value: any): void {
    if (key === "isRescued") {
      const wasRescued = this.isRescued;
      this.isRescued = value;
      // Initialize facing direction when rescued
      if (this.isRescued && !wasRescued && this.lastFacing === Direction.Down) {
        const velocity = this.getVelocity();
        const velocityDirection = determineDirection(velocity);
        if (velocityDirection) {
          this.lastFacing = velocityDirection;
        }
      }
    } else {
      super.deserializeProperty(key, value);
    }
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  private getSurvivorAssetPrefix(): string {
    return "survivor";
  }

  private getPosition(): Vector2 {
    const positionable = this.getExt(ClientPositionable);
    return positionable.getPosition();
  }

  private getCenterPosition(): Vector2 {
    const positionable = this.getExt(ClientPositionable);
    return positionable.getCenterPosition();
  }

  private getVelocity(): Vector2 {
    if (!this.hasExt(ClientMovable)) {
      return PoolManager.getInstance().vector2.claim(0, 0);
    }
    const movable = this.getExt(ClientMovable);
    return movable.getVelocity();
  }

  private getHealth(): number {
    if (!this.hasExt(ClientDestructible)) {
      return SURVIVOR_MAX_HEALTH; // Return max health if not rescued yet (invincible)
    }
    const destructible = this.getExt(ClientDestructible);
    return destructible.getHealth();
  }

  private getMaxHealth(): number {
    if (!this.hasExt(ClientDestructible)) {
      return SURVIVOR_MAX_HEALTH; // Return max health if not rescued yet
    }
    const destructible = this.getExt(ClientDestructible);
    return destructible.getMaxHealth();
  }

  private isDead(): boolean {
    if (!this.hasExt(ClientDestructible)) {
      return false; // Not dead if not rescued yet (invincible)
    }
    const destructible = this.getExt(ClientDestructible);
    return destructible.isDead();
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const currentHealth = this.getHealth();

    if (this.previousHealth !== undefined && currentHealth < this.previousHealth) {
      this.damageFlashUntil = Date.now() + 250;
    }
    this.previousHealth = currentHealth;

    const isDead = this.isDead();

    // Only update position if alive to prevent jittering when dead
    if (!isDead) {
      const targetPosition = this.getPosition();
      this.lastRenderPosition = this.lerpPosition(
        targetPosition,
        PoolManager.getInstance().vector2.claim(
          this.lastRenderPosition.x,
          this.lastRenderPosition.y
        )
      );
    }

    const renderPosition = roundVector2(
      PoolManager.getInstance().vector2.claim(this.lastRenderPosition.x, this.lastRenderPosition.y)
    );

    if (isDead) {
      this.renderDead(ctx, renderPosition, gameState);
    } else {
      this.renderAlive(ctx, renderPosition, gameState);
    }

    // Render interaction text (calls super.render which handles it)
    super.render(ctx, gameState);
    this.hasRenderedOnce = true;
  }

  private renderAlive(
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2,
    gameState: GameState
  ): void {
    const velocity = this.getVelocity();
    const movingByVelocity = isMoving(velocity);
    // Only animate if velocity indicates movement (server sets velocity to 0 during pause)
    // Don't use position delta to avoid animation from interpolation jitter when paused
    const shouldAnimate = movingByVelocity;
    const assetKey = this.getSurvivorAssetPrefix();
    let image: HTMLImageElement;

    // Always determine facing and animation based on movement
    if (shouldAnimate) {
      // Use velocity directly since we're only animating when velocity indicates movement
      this.lastFacing = resolveFacingFromVector(velocity, this.lastFacing);

      const frameIndex = getFrameIndex(gameState.startedAt, {
        duration: SURVIVOR_WALK_ANIMATION_DURATION,
        frames: 3,
      });

      image = this.imageLoader.getFrameWithDirection(assetKey as any, this.lastFacing, frameIndex);
    } else {
      // If not rescued and not moving, default to facing down
      if (!this.isRescued && this.lastFacing === Direction.Down) {
        this.lastFacing = Direction.Down;
      }
      image = this.imageLoader.getWithDirection(assetKey as any, this.lastFacing);
    }

    ctx.drawImage(image, renderPosition.x, renderPosition.y);

    // Render pistol in hand when rescued
    this.renderPistol(ctx, renderPosition);

    drawHealthBar(ctx, renderPosition, this.getHealth(), this.getMaxHealth());

    // Render flash effect on damage
    if (Date.now() <= this.damageFlashUntil) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "white";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(image, renderPosition.x, renderPosition.y);
      ctx.restore();
    }
  }

  private renderDead(
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2,
    gameState: GameState
  ): void {
    const myPlayer = getPlayer(gameState);
    const image = this.imageLoader.get(`${this.getSurvivorAssetPrefix()}_dead` as any);

    if (image) {
      ctx.drawImage(image, renderPosition.x, renderPosition.y);
    }

    // Render loot interaction text
    if (myPlayer && myPlayer.hasExt(ClientPositionable) && this.hasExt(ClientInteractive)) {
      const positionable = this.getExt(ClientPositionable);
      const size = positionable.getSize();
      const poolManager = PoolManager.getInstance();
      const centerPosition = poolManager.vector2.claim(
        renderPosition.x + size.x / 2,
        renderPosition.y + size.y / 2
      );

      // Check if this is the closest interactive entity (cached in gameState)
      const isClosest = gameState.closestInteractiveEntityId === this.getId();

      renderInteractionText(
        ctx,
        `loot (${getConfig().keybindings.INTERACT})`,
        centerPosition,
        renderPosition,
        myPlayer.getExt(ClientPositionable).getPosition(),
        PoolManager.getInstance().vector2.claim(0, 0),
        isClosest
      );
    }
  }

  private renderPistol(ctx: CanvasRenderingContext2D, renderPosition: Vector2): void {
    // Create a pistol item for rendering purposes
    const pistolItem: InventoryItem = {
      itemType: "pistol",
    };

    const pistolAssetKey = getItemAssetKey(pistolItem);
    const pistolImage = this.imageLoader.getWithDirection(pistolAssetKey, this.lastFacing);
    ctx.drawImage(pistolImage, renderPosition.x + 2, renderPosition.y);
  }
}
