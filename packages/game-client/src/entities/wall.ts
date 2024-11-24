import { Entities, EntityType, Positionable, Vector2 } from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { GameState } from "../state";
import { IClientEntity, Renderable } from "./util";

const WALL_SIZE = 16;

export class WallClient implements Renderable, Positionable, IClientEntity {
  private assetManager: AssetManager;
  private type: EntityType;
  private id: string;
  private position: Vector2 = { x: 0, y: 0 };

  constructor(id: string, assetManager: AssetManager) {
    this.id = id;
    this.type = Entities.WALL;
    this.assetManager = assetManager;
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
  }
}
