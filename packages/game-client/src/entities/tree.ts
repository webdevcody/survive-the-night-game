import {
  GenericEntity,
  Player,
  Positionable,
  PositionableTrait,
  RawEntity,
  distance,
} from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { GameState, getEntityById } from "../state";
import { Renderable } from "./util";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";

export class TreeClient extends GenericEntity implements Renderable {
  private assetManager: AssetManager;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data);
    this.assetManager = assetManager;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get("Tree");
    const myPlayer = getEntityById(gameState, gameState.playerId) as PositionableTrait | undefined;
    const positionable = this.getExt(Positionable);
    const centerPosition = positionable.getCenterPosition();
    const position = positionable.getPosition();

    if (myPlayer && distance(myPlayer.getPosition(), position) < Player.MAX_INTERACT_RADIUS) {
      ctx.fillStyle = "white";
      ctx.font = "6px Arial";
      const text = "twigs (e)";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, centerPosition.x - textWidth / 2, position.y - 3);
    }

    ctx.drawImage(image, position.x, position.y);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }
}
