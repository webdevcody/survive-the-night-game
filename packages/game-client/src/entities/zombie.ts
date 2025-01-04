import {
  determineDirection,
  roundVector2,
  Vector2,
  Player,
  distance,
  GenericEntity,
  RawEntity,
  Destructible,
  Positionable,
  Collidable,
  Ignitable,
} from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { drawHealthBar, getFrameIndex, IClientEntity, Renderable } from "./util";
import { GameState } from "../state";
import { debugDrawHitbox, drawCenterPositionWithLabel } from "../util/debug";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import Movable from "@survive-the-night/game-server/src/shared/extensions/movable";
import { createFlashEffect } from "../util/render";
import { getPlayer } from "../util/get-player";
import { renderInteractionText } from "../util/interaction-text";

export class ZombieClient extends GenericEntity implements IClientEntity, Renderable {
  private assetManager: AssetManager;
  private lastRenderPosition = { x: 0, y: 0 };
  private readonly LERP_FACTOR = 0.1;
  private previousHealth: number | undefined;
  private damageFlashUntil: number = 0;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data);
    this.assetManager = assetManager;
  }

  public getZIndex(): number {
    return Z_INDEX.PLAYERS;
  }

  private getPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    const position = positionable.getPosition();
    return position;
  }

  getCenterPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    return positionable.getCenterPosition();
  }

  setVelocity(velocity: Vector2): void {
    const movable = this.getExt(Movable);
    movable.setVelocity(velocity);
  }

  getVelocity(): Vector2 {
    const movable = this.getExt(Movable);
    return movable.getVelocity();
  }

  getMaxHealth(): number {
    const destructible = this.getExt(Destructible);
    return destructible.getMaxHealth();
  }

  getHealth(): number {
    const destructible = this.getExt(Destructible);
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

    const renderPosition = roundVector2(this.lastRenderPosition);
    const facing = determineDirection(this.getVelocity());

    const frameIndex = getFrameIndex(gameState.startedAt, {
      duration: 500,
      frames: 3,
    });

    const destructible = this.getExt(Destructible);
    const isDead = destructible.isDead();

    const image = isDead
      ? this.assetManager.get("zombie_dead")
      : this.assetManager.getFrameWithDirection("zombie", facing, frameIndex);

    ctx.drawImage(image, renderPosition.x, renderPosition.y);

    if (this.hasExt(Ignitable) && !isDead) {
      const frameIndex = getFrameIndex(gameState.startedAt, {
        duration: 500,
        frames: 5,
      });
      const fireImg = this.assetManager.getFrameIndex("flame", frameIndex);
      ctx.drawImage(fireImg, renderPosition.x, renderPosition.y);
    }

    if (isDead) {
      const myPlayer = getPlayer(gameState);

      if (myPlayer) {
        renderInteractionText(
          ctx,
          "loot (e)",
          this.getCenterPosition(),
          this.getPosition(),
          myPlayer.getPosition()
        );
      }
    } else {
      const collidable = this.getExt(Collidable);
      drawHealthBar(ctx, renderPosition, this.getHealth(), this.getMaxHealth());
      debugDrawHitbox(ctx, collidable.getHitBox());
      debugDrawHitbox(ctx, destructible.getDamageBox(), "red");
      drawCenterPositionWithLabel(ctx, this.getCenterPosition());
    }

    if (Date.now() < this.damageFlashUntil) {
      const flashEffect = createFlashEffect(image);
      ctx.drawImage(flashEffect, renderPosition.x, renderPosition.y);
    }
  }
}
