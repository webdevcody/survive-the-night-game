import {
  GenericEntity,
  Player,
  Positionable,
  PositionableTrait,
  RawEntity,
  distance,
} from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { GameState, getEntityById } from "../../state";
import { Renderable } from "../util";

const ENTITY_SIZE = 16;

export class ClothClient extends GenericEntity implements Renderable {
  private assetManager: AssetManager;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data);
    this.assetManager = assetManager;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get("Cloth");
    const myPlayer = getEntityById(gameState, gameState.playerId) as PositionableTrait | undefined;
    const positionable = this.getExt(Positionable);
    const position = positionable.getPosition();

    if (myPlayer && distance(myPlayer.getPosition(), position) < Player.MAX_INTERACT_RADIUS) {
      ctx.fillStyle = "white";
      ctx.font = "6px Arial";
      const text = "collect (e)";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, position.x + ENTITY_SIZE / 2 - textWidth / 2, position.y - 3);
    }

    ctx.drawImage(image, position.x, position.y);
  }
}
