import {
  Entities,
  EntityType,
  Positionable,
  determineDirection,
  roundVector2,
  Vector2,
  Damageable,
  Hitbox,
} from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { drawHealthBar, IClientEntity, Renderable } from "./util";
import { GameState } from "@/state";
import { debugDrawHitbox } from "../util/debug";
import { Zombie } from "@survive-the-night/game-server/src/shared/entities/zombie";

export class ZombieClient implements IClientEntity, Renderable, Positionable, Damageable {
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
    const direction = determineDirection(this.velocity);

    // Draw the zombie
    const image = this.assetManager.getWithDirection("Zombie", direction);
    ctx.drawImage(image, renderPosition.x, renderPosition.y);

    drawHealthBar(ctx, renderPosition, this.health, this.getMaxHealth());

    debugDrawHitbox(ctx, Zombie.getHitbox(this.position));
    debugDrawHitbox(ctx, Zombie.getDamageBox(this.position), "red");
  }
}
