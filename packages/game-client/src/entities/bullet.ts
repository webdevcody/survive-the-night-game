import { Entities, EntityType, Positionable, Vector2 } from "@survive-the-night/game-server";
import { GameState } from "../state";
import { IClientEntity, Renderable } from "./util";
import { HITBOX_RADIUS } from "@survive-the-night/game-server/src/shared/entities/bullet";

export class BulletClient implements IClientEntity, Renderable, Positionable {
  private position: Vector2 = { x: 0, y: 0 };
  private type: EntityType;
  private id: string;

  constructor(id: string) {
    this.id = id;
    this.type = Entities.BULLET;
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
    return this.position;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, HITBOX_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "orange";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
