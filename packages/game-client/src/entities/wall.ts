import { Entities, EntityType, Positionable, Vector2 } from "@survive-the-night/game-server";
import { type GameState } from "../state";
import { IClientEntity, Renderable } from "./util";

const WALL_SIZE = 16;

export class WallClient implements Renderable, Positionable, IClientEntity {
  private image = new Image();
  private type: EntityType;
  private id: string;
  private position: Vector2 = { x: 0, y: 0 };

  constructor(id: string) {
    this.id = id;
    this.type = Entities.WALL;
    this.image.src = "/wall.png";
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
    ctx.drawImage(this.image, this.getPosition().x, this.getPosition().y);
  }
}
