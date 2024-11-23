import {
  Entities,
  EntityType,
  Positionable,
  roundVector2,
  Vector2,
} from "@survive-the-night/game-server";
import { IClientEntity, Renderable } from "./util";
import { GameState } from "@/state";

export class PlayerClient implements IClientEntity, Renderable, Positionable {
  private image = new Image();
  private lastRenderPosition = { x: 0, y: 0 };
  private readonly LERP_FACTOR = 0.1;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private id: string;
  private type: EntityType;
  private readonly ARROW_LENGTH = 20;

  constructor(id: string) {
    this.id = id;
    this.type = Entities.PLAYER;
    this.image.src = "/player.png";
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

    ctx.drawImage(this.image, renderPosition.x, renderPosition.y);

    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    if (speed > 0) {
      const direction = {
        x: this.velocity.x / speed,
        y: this.velocity.y / speed,
      };

      const arrowStart = {
        x: renderPosition.x + this.image.width / 2,
        y: renderPosition.y + this.image.height / 2,
      };

      const arrowEnd = {
        x: arrowStart.x + direction.x * this.ARROW_LENGTH,
        y: arrowStart.y + direction.y * this.ARROW_LENGTH,
      };

      ctx.beginPath();
      ctx.moveTo(arrowStart.x, arrowStart.y);
      ctx.lineTo(arrowEnd.x, arrowEnd.y);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.stroke();

      const headLength = 8;
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
      ctx.fillStyle = "red";
      ctx.fill();
    }
  }
}
