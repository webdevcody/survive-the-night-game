import {
  Damageable,
  distance,
  Entities,
  EntityType,
  Hitbox,
  Player,
  PositionableTrait,
  Vector2,
} from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { GameState, getEntityById } from "../state";
import { drawHealthBar, IClientEntity, Renderable } from "./util";
import { WALL_MAX_HEALTH } from "@survive-the-night/game-server/src/shared/entities/wall";

const WALL_SIZE = 16;

export class WallClient implements Renderable, PositionableTrait, IClientEntity, Damageable {
  private assetManager: AssetManager;
  private type: EntityType;
  private id: string;
  private position: Vector2 = { x: 0, y: 0 };
  private health: number = 0;

  constructor(id: string, assetManager: AssetManager) {
    this.id = id;
    this.type = Entities.WALL;
    this.assetManager = assetManager;
  }

  damage(damage: number): void {
    this.health -= damage;
  }

  getHealth(): number {
    return this.health;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  getDamageBox(): Hitbox {
    return {
      x: this.position.x,
      y: this.position.y,
      width: WALL_SIZE,
      height: WALL_SIZE,
    };
  }

  getMaxHealth(): number {
    return WALL_MAX_HEALTH;
  }

  getId(): string {
    return this.id;
  }

  getType(): EntityType {
    return this.type;
  }

  setType(type: EntityType): void {
    this.type = type;
  }

  setId(id: string): void {
    this.id = id;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  getCenterPosition(): Vector2 {
    return {
      x: this.position.x + WALL_SIZE / 2,
      y: this.position.y + WALL_SIZE / 2,
    };
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get("Wall");
    ctx.drawImage(image, this.getPosition().x, this.getPosition().y);

    const myPlayer = getEntityById(gameState, gameState.playerId) as PositionableTrait | undefined;
    if (
      myPlayer &&
      distance(myPlayer.getPosition(), this.getPosition()) < Player.MAX_INTERACT_RADIUS
    ) {
      ctx.fillStyle = "white";
      ctx.font = "6px Arial";
      const text = "pick up (e)";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, this.getCenterPosition().x - textWidth / 2, this.getPosition().y - 3);
    }

    ctx.drawImage(image, this.getPosition().x, this.getPosition().y);

    drawHealthBar(ctx, this.getPosition(), this.getHealth(), this.getMaxHealth());
  }
}
