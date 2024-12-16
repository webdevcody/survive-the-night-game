import {
  Entities,
  EntityType,
  PositionableTrait,
  determineDirection,
  roundVector2,
  Vector2,
  Damageable,
  Hitbox,
  Player,
  distance,
} from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { drawHealthBar, getFrameIndex, IClientEntity, Renderable } from "./util";
import { GameState, getEntityById } from "../state";
import { debugDrawHitbox } from "../util/debug";
import { Zombie } from "@survive-the-night/game-server/src/shared/entities/zombie";

export class ZombieClient implements IClientEntity, Renderable, PositionableTrait, Damageable {
  private assetManager: AssetManager;
  private lastRenderPosition = { x: 0, y: 0 };
  private readonly LERP_FACTOR = 0.1;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private id: string;
  private type: EntityType;
  private health = 3;

  constructor(id: string, assetManager: AssetManager) {
    this.id = id;
    this.type = Entities.ZOMBIE;
    this.assetManager = assetManager;
  }

  getMaxHealth(): number {
    return 3;
  }

  heal(amount: number): void {
    this.health += amount;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
  }

  getType(): EntityType {
    return this.type;
  }

  setType(type: EntityType): void {
    this.type = type;
  }

  getHealth(): number {
    return this.health;
  }

  damage(damage: number): void {
    this.health -= damage;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  setVelocity(velocity: Vector2): void {
    this.velocity = velocity;
  }

  getDamageBox(): Hitbox {
    return Zombie.getDamageBox(this.position);
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const targetPosition = this.getPosition();

    this.lastRenderPosition.x += (targetPosition.x - this.lastRenderPosition.x) * this.LERP_FACTOR;
    this.lastRenderPosition.y += (targetPosition.y - this.lastRenderPosition.y) * this.LERP_FACTOR;

    const renderPosition = roundVector2(this.lastRenderPosition);
    const facing = determineDirection(this.velocity);

    const frameIndex = getFrameIndex(gameState.startedAt, {
      duration: 500,
      frames: 3,
    });

    const image = this.isDead()
      ? this.assetManager.get("ZombieDead")
      : this.assetManager.getFrameWithDirection("Zombie", facing, frameIndex);

    ctx.drawImage(image, renderPosition.x, renderPosition.y);

    if (this.isDead()) {
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
      drawHealthBar(ctx, renderPosition, this.health, this.getMaxHealth());
      debugDrawHitbox(ctx, Zombie.getHitbox(this.position));
      debugDrawHitbox(ctx, Zombie.getDamageBox(this.position), "red");
    }
  }
}
