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
  private id: string;
  private type: EntityType;

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

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const targetPosition = this.getPosition();

    this.lastRenderPosition.x +=
      (targetPosition.x - this.lastRenderPosition.x) * this.LERP_FACTOR;
    this.lastRenderPosition.y +=
      (targetPosition.y - this.lastRenderPosition.y) * this.LERP_FACTOR;

    const renderPosition = roundVector2(this.lastRenderPosition);

    ctx.drawImage(this.image, renderPosition.x, renderPosition.y);

    // hitbox
    // const serverPosition = roundVector2(targetPosition);
    // ctx.fillStyle = "red";
    // ctx.fillRect(serverPosition.x, serverPosition.y, 10, 10);
  }
}
