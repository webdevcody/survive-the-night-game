import {
  ClientPositionable,
  ClientMovable,
  ClientDestructible,
  ClientIgnitable,
  ClientCollidable,
} from "@/extensions";
import { ClientEntityBase } from "@/extensions/client-entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { debugDrawHitbox, drawCenterPositionWithLabel } from "@/util/debug";
import { getPlayer } from "@/util/get-player";
import { renderInteractionText } from "@/util/interaction-text";
import { createFlashEffect } from "@/util/render";
import { ClientInteractive } from "@/extensions";
import { RawEntity } from "@shared/types/entity";
import { Z_INDEX } from "@shared/map";
import { IClientEntity, Renderable, getFrameIndex, drawHealthBar } from "@/entities/util";
import { renderBossPresentation } from "./util/boss-presentation";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { DEBUG_SHOW_WAYPOINTS } from "@shared/debug";
import { determineDirection } from "@shared/util/direction";
import { getHitboxWithPadding } from "@shared/util/hitbox";
import { roundVector2 } from "@shared/util/physics";
import { EntityCategory, EntityCategories, zombieRegistry, ZombieConfig } from "@shared/entities";
import { getConfig } from "@shared/config";

export abstract class EnemyClient extends ClientEntityBase implements IClientEntity, Renderable {
  private lastRenderPosition = { x: 0, y: 0 };
  private previousHealth: number | undefined;
  private damageFlashUntil: number = 0;
  protected debugWaypoint: Vector2 | null = null;
  protected config: ZombieConfig;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);

    // Get config from registry
    this.config = zombieRegistry.get(data.type)!;
    if (!this.config) {
      throw new Error(`Zombie config not found for ${data.type}`);
    }
  }

  public getZIndex(): number {
    return Z_INDEX.ENEMIES;
  }

  public getCategory(): EntityCategory {
    return EntityCategories.ZOMBIE;
  }

  protected getPosition(): Vector2 {
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    return position;
  }

  getCenterPosition(): Vector2 {
    const positionable = this.getExt(ClientPositionable);
    return positionable.getCenterPosition();
  }

  setVelocity(velocity: Vector2): void {
    const movable = this.getExt(ClientMovable);
    movable.setVelocity(velocity);
  }

  getVelocity(): Vector2 {
    const movable = this.getExt(ClientMovable);
    return movable.getVelocity();
  }

  getMaxHealth(): number {
    const destructible = this.getExt(ClientDestructible);
    return destructible.getMaxHealth();
  }

  getHealth(): number {
    const destructible = this.getExt(ClientDestructible);
    return destructible.getHealth();
  }

  deserializeProperty(key: string, value: any): void {
    super.deserializeProperty(key, value);
    if (key === "debugWaypoint") {
      this.debugWaypoint = value;
    }
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const currentHealth = this.getHealth();

    if (this.previousHealth !== undefined && currentHealth < this.previousHealth) {
      this.damageFlashUntil = Date.now() + 250;
    }
    this.previousHealth = currentHealth;

    const destructible = this.getExt(ClientDestructible);
    const isDead = destructible.isDead();

    // Only update position if alive to prevent jittering when dead
    if (!isDead) {
      const targetPosition = this.getPosition();
      this.lastRenderPosition = this.lerpPosition(
        targetPosition,
        PoolManager.getInstance().vector2.claim(this.lastRenderPosition.x, this.lastRenderPosition.y)
      );
    }

    const poolManager = PoolManager.getInstance();
    const renderPosition = roundVector2(
      poolManager.vector2.claim(this.lastRenderPosition.x, this.lastRenderPosition.y)
    );

    isDead
      ? this.renderEnemyDead(gameState, ctx, renderPosition)
      : this.renderEnemyAlive(gameState, ctx, renderPosition);

    this.renderDebugWaypoint(ctx);
  }

  protected renderDebugWaypoint(ctx: CanvasRenderingContext2D): void {
    if (DEBUG_SHOW_WAYPOINTS && this.debugWaypoint) {
      const waypoint = this.debugWaypoint;
      ctx.save();
      ctx.strokeStyle = this.config.assets.debugWaypointColor;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(this.lastRenderPosition.x + 8, this.lastRenderPosition.y + 8);
      ctx.lineTo(waypoint.x, waypoint.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(waypoint.x, waypoint.y, 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  protected getDebugWaypointColor(): string {
    return this.config.assets.debugWaypointColor;
  }

  protected getEnemyAssetPrefix(): string {
    return this.config.assets.assetPrefix;
  }

  protected getAnimationDuration(): number {
    return this.config.assets.animationDuration;
  }

  protected getAnimationFrameCount(): number {
    return this.config.assets.frameLayout.totalFrames ?? 3;
  }

  protected renderFlames(
    gameState: GameState,
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2
  ) {
    const isOnFire = this.hasExt(ClientIgnitable);
    if (!isOnFire) return;

    const frameIndex = getFrameIndex(gameState.startedAt, {
      duration: 500,
      frames: 5,
    });
    const fireImg = this.imageLoader.getFrameIndex("flame", frameIndex);
    ctx.drawImage(fireImg, renderPosition.x, renderPosition.y);
  }

  protected renderEnemyAlive(
    gameState: GameState,
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2
  ) {
    const positionable = this.getExt(ClientPositionable);
    const collidable = this.getExt(ClientCollidable);
    const facing = determineDirection(this.getVelocity());
    const frameIndex = getFrameIndex(gameState.startedAt, {
      duration: this.getAnimationDuration(),
      frames: this.getAnimationFrameCount(),
    });
    const image = this.imageLoader.getFrameWithDirection(
      this.getEnemyAssetPrefix() as any,
      facing,
      frameIndex
    );
    ctx.drawImage(image, renderPosition.x, renderPosition.y);

    if (this.config.boss) {
      renderBossPresentation({
        ctx,
        metadata: this.config.boss,
        renderPosition,
        entitySize: positionable.getSize(),
        health: this.getHealth(),
        maxHealth: this.getMaxHealth(),
      });
    } else {
      drawHealthBar(ctx, renderPosition, this.getHealth(), this.getMaxHealth());
    }

    // Debug hitboxes
    debugDrawHitbox(ctx, collidable.getHitBox(), "yellow");
    debugDrawHitbox(ctx, getHitboxWithPadding(positionable.getPosition(), 0), "red");
    drawCenterPositionWithLabel(ctx, this.getCenterPosition());

    this.renderFlames(gameState, ctx, renderPosition);
    this.renderFlashEffect(image, ctx, renderPosition);
  }

  protected renderFlashEffect(
    image: HTMLImageElement,
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2
  ) {
    if (Date.now() > this.damageFlashUntil) {
      return;
    }

    const flashEffect = createFlashEffect(image);
    ctx.drawImage(flashEffect, renderPosition.x, renderPosition.y);
  }

  protected renderEnemyDead(
    gameState: GameState,
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2
  ) {
    const myPlayer = getPlayer(gameState);
    const image = this.imageLoader.get(`${this.getEnemyAssetPrefix()}_dead` as any);
    ctx.drawImage(image, renderPosition.x, renderPosition.y);

    if (myPlayer && myPlayer.hasExt(ClientPositionable)) {
      // Use frozen render position to prevent jittering of loot text
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
}
