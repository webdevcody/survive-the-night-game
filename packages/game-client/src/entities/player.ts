import {
  Entities,
  EntityType,
  Positionable,
  roundVector2,
  Vector2,
  normalizeVector,
  determineDirection,
  isDirectionDown,
  isDirectionLeft,
  isDirectionRight,
  isDirectionUp,
} from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { IClientEntity, Renderable } from "./util";
import { GameState } from "@/state";

export class PlayerClient implements IClientEntity, Renderable, Positionable {
  private assetManager: AssetManager;
  private lastRenderPosition = { x: 0, y: 0 };
  private readonly LERP_FACTOR = 0.1;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private id: string;
  private type: EntityType;
  private readonly ARROW_LENGTH = 20;

  constructor(id: string, assetManager: AssetManager) {
    this.id = id;
    this.type = Entities.PLAYER;
    this.assetManager = assetManager;
  }

  getImage(): HTMLImageElement {
    const direction = determineDirection(this.velocity);

    if (direction && isDirectionLeft(direction)) {
      return this.assetManager.get("PlayerFacingLeft");
    }

    if (direction && isDirectionRight(direction)) {
      return this.assetManager.get("PlayerFacingRight");
    }

    if (direction && isDirectionDown(direction)) {
      return this.assetManager.get("PlayerFacingDown");
    }

    if (direction && isDirectionUp(direction)) {
      return this.assetManager.get("PlayerFacingUp");
    }

    return this.assetManager.get("PlayerFacingCenter");
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
    const image = this.getImage();

    this.lastRenderPosition.x += (targetPosition.x - this.lastRenderPosition.x) * this.LERP_FACTOR;
    this.lastRenderPosition.y += (targetPosition.y - this.lastRenderPosition.y) * this.LERP_FACTOR;

    const renderPosition = roundVector2(this.lastRenderPosition);

    ctx.drawImage(image, renderPosition.x, renderPosition.y);

    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    if (speed > 0) {
      const direction = normalizeVector(this.velocity);

      const arrowStart = {
        x: renderPosition.x + image.width / 2,
        y: renderPosition.y + image.height / 2,
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
