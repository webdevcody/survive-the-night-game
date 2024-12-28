import {
  PositionableTrait,
  determineDirection,
  roundVector2,
  Vector2,
  Player,
  distance,
  GenericEntity,
  RawEntity,
  Destructible,
  Positionable,
} from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { drawHealthBar, getFrameIndex, IClientEntity, Renderable } from "./util";
import { GameState, getEntityById } from "../state";
import { debugDrawHitbox } from "../util/debug";
import { Zombie } from "@survive-the-night/game-server/src/shared/entities/zombie";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import Movable from "@survive-the-night/game-server/src/shared/extensions/movable";

export class ZombieClient extends GenericEntity implements IClientEntity, Renderable {
  private assetManager: AssetManager;
  private lastRenderPosition = { x: 0, y: 0 };
  private readonly LERP_FACTOR = 0.1;

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
      ? this.assetManager.get("ZombieDead")
      : this.assetManager.getFrameWithDirection("Zombie", facing, frameIndex);

    ctx.drawImage(image, renderPosition.x, renderPosition.y);

    if (isDead) {
      const myPlayer = getEntityById(gameState, gameState.playerId) as
        | PositionableTrait
        | undefined;

      if (
        myPlayer !== undefined &&
        distance(myPlayer.getPosition(), this.getPosition()) < Player.MAX_INTERACT_RADIUS
      ) {
        ctx.fillStyle = "white";
        ctx.font = "6px Arial";
        const text = "loot (e)";
        const textWidth = ctx.measureText(text).width;
        ctx.fillText(text, this.getCenterPosition().x - textWidth / 2, this.getPosition().y - 3);
      }
    } else {
      drawHealthBar(ctx, renderPosition, this.getHealth(), this.getMaxHealth());
      debugDrawHitbox(ctx, Zombie.getHitbox(this.getPosition()));
      debugDrawHitbox(ctx, destructible.getDamageBox(), "red");
    }
  }
}
