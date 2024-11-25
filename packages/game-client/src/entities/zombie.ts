import {
  Entities,
  EntityType,
  Positionable,
  roundVector2,
  Vector2,
} from "@survive-the-night/game-server";
import { IClientEntity, Renderable } from "./util";
import { GameState } from "@/state";

export class ZombieClient implements IClientEntity, Renderable, Positionable {
  private image = new Image();
  private lastRenderPosition = { x: 0, y: 0 };
  private readonly LERP_FACTOR = 0.1;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private id: string;
  private type: EntityType;
  private health = 2;

  constructor(id: string) {
    this.id = id;
    this.type = Entities.ZOMBIE;
    this.image.src = "/zombie.png";
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

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const targetPosition = this.getPosition();

    this.lastRenderPosition.x += (targetPosition.x - this.lastRenderPosition.x) * this.LERP_FACTOR;
    this.lastRenderPosition.y += (targetPosition.y - this.lastRenderPosition.y) * this.LERP_FACTOR;

    const renderPosition = roundVector2(this.lastRenderPosition);

    // Draw the zombie
    ctx.drawImage(this.image, renderPosition.x, renderPosition.y);

    // Draw health bar
    const healthBarWidth = 16; // Same as zombie width
    const healthBarHeight = 2;
    const healthBarY = renderPosition.y - healthBarHeight - 2; // 2 pixels above zombie

    // Background (red)
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(renderPosition.x, healthBarY, healthBarWidth, healthBarHeight);

    // Foreground (green) - scales with health
    ctx.fillStyle = "#00ff00";
    const healthPercentage = this.health / 2; // 2 is max health
    ctx.fillRect(renderPosition.x, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
  }
}
