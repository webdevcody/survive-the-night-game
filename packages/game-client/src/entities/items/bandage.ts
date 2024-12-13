import {
  distance,
  Entities,
  EntityType,
  Player,
  Positionable,
  Vector2,
} from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { getEntityById, GameState } from "../../state";
import { IClientEntity, Renderable } from "../util";

const TREE_SIZE = 16;

export class BandageClient implements Renderable, Positionable, IClientEntity {
  private assetManager: AssetManager;
  private type: EntityType;
  private id: string;
  private position: Vector2 = { x: 0, y: 0 };

  constructor(id: string, assetManager: AssetManager) {
    this.id = id;
    this.type = Entities.BANDAGE;
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
      x: this.position.x + TREE_SIZE / 2,
      y: this.position.y + TREE_SIZE / 2,
    };
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get("Bandage");
    const myPlayer = getEntityById(gameState, gameState.playerId) as Positionable | undefined;

    if (
      myPlayer &&
      distance(myPlayer.getPosition(), this.getPosition()) < Player.MAX_INTERACT_RADIUS
    ) {
      ctx.fillStyle = "white";
      ctx.font = "6px Arial";
      const text = "bandage (e)";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, this.getCenterPosition().x - textWidth / 2, this.getPosition().y - 3);
    }

    ctx.drawImage(image, this.getPosition().x, this.getPosition().y);
  }
}
