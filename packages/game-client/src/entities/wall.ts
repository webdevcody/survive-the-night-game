import {
  Destructible,
  GenericEntity,
  Player,
  Positionable,
  RawEntity,
  distance,
} from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { GameState } from "../state";
import { Renderable, drawHealthBar } from "./util";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { getPlayer } from "../util/get-player";

export class WallClient extends GenericEntity implements Renderable {
  private assetManager: AssetManager;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data);
    this.assetManager = assetManager;
  }

  public getZIndex(): number {
    return Z_INDEX.BUILDINGS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get("Wall");
    const myPlayer = getPlayer(gameState);
    const destructible = this.getExt(Destructible);
    const positionable = this.getExt(Positionable);
    const centerPosition = positionable.getCenterPosition();
    const position = positionable.getPosition();

    if (myPlayer && distance(myPlayer.getPosition(), position) < Player.MAX_INTERACT_RADIUS) {
      ctx.fillStyle = "white";
      ctx.font = "6px Arial";
      const text = "pick up (e)";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, centerPosition.x - textWidth / 2, position.y - 3);
    }

    ctx.drawImage(image, position.x, position.y);
    drawHealthBar(ctx, position, destructible.getHealth(), destructible.getMaxHealth());
  }
}
