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
import { determineDirection } from "../../../game-shared/src/util/direction";
import { roundVector2 } from "../../../game-shared/src/util/physics";
import { RawEntity } from "@shared/types/entity";
import { Z_INDEX } from "@shared/map";
import { IClientEntity, Renderable, getFrameIndex, drawHealthBar } from "@/entities/util";
import { getHitboxWithPadding } from "../../../game-shared/src/util/hitbox";
import Vector2 from "@shared/util/vector2";

export class ZombieClient extends ClientEntityBase implements IClientEntity, Renderable {
  private lastRenderPosition = { x: 0, y: 0 };
  private readonly LERP_FACTOR = 0.1;
  private previousHealth: number | undefined;
  private damageFlashUntil: number = 0;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ENEMIES;
  }

  private getPosition(): Vector2 {
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

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const currentHealth = this.getHealth();

    if (this.previousHealth !== undefined && currentHealth < this.previousHealth) {
      this.damageFlashUntil = Date.now() + 250;
    }
    this.previousHealth = currentHealth;

    const targetPosition = this.getPosition();

    this.lastRenderPosition.x += (targetPosition.x - this.lastRenderPosition.x) * this.LERP_FACTOR;
    this.lastRenderPosition.y += (targetPosition.y - this.lastRenderPosition.y) * this.LERP_FACTOR;

    const renderPosition = roundVector2(
      new Vector2(this.lastRenderPosition.x, this.lastRenderPosition.y)
    );

    const destructible = this.getExt(ClientDestructible);
    const isDead = destructible.isDead();

    isDead
      ? this.renderZombieDead(gameState, ctx, renderPosition)
      : this.renderZombieAlive(gameState, ctx, renderPosition);
  }

  private renderFlames(
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

  private renderZombieAlive(
    gameState: GameState,
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2
  ) {
    const facing = determineDirection(this.getVelocity());
    const frameIndex = getFrameIndex(gameState.startedAt, {
      duration: 500,
      frames: 3,
    });
    const image = this.imageLoader.getFrameWithDirection("zombie", facing, frameIndex);
    ctx.drawImage(image, renderPosition.x, renderPosition.y);
    drawHealthBar(ctx, renderPosition, this.getHealth(), this.getMaxHealth());

    // Debug hitboxes
    const positionable = this.getExt(ClientPositionable);
    const collidable = this.getExt(ClientCollidable);
    debugDrawHitbox(ctx, collidable.getHitBox(), "yellow");
    debugDrawHitbox(ctx, getHitboxWithPadding(positionable.getPosition(), 0), "red");
    drawCenterPositionWithLabel(ctx, this.getCenterPosition());

    this.renderFlames(gameState, ctx, renderPosition);
    this.renderFlashEffect(image, ctx, renderPosition);
  }

  private renderFlashEffect(
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

  private renderZombieDead(
    gameState: GameState,
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2
  ) {
    const myPlayer = getPlayer(gameState);
    const image = this.imageLoader.get("zombie_dead");
    ctx.drawImage(image, renderPosition.x, renderPosition.y);

    if (myPlayer) {
      renderInteractionText(
        ctx,
        "loot (e)",
        this.getCenterPosition(),
        this.getPosition(),
        myPlayer.getPosition()
      );
    }
  }
}
