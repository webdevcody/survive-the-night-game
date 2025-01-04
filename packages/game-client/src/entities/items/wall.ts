import {
  Destructible,
  GenericEntity,
  Player,
  Positionable,
  RawEntity,
  distance,
} from "@survive-the-night/game-server";
import { AssetManager } from "../../managers/asset";
import { GameState } from "../../state";
import { Renderable, drawHealthBar } from "../util";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { getPlayer } from "../../util/get-player";
import { renderInteractionText } from "../../util/interaction-text";

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
    const image = this.assetManager.get("wall");
    const myPlayer = getPlayer(gameState);
    const destructible = this.getExt(Destructible);
    const positionable = this.getExt(Positionable);
    const centerPosition = positionable.getCenterPosition();
    const position = positionable.getPosition();

    if (myPlayer) {
      renderInteractionText(ctx, "pick up (e)", centerPosition, position, myPlayer.getPosition());
    }

    ctx.drawImage(image, position.x, position.y);
    drawHealthBar(ctx, position, destructible.getHealth(), destructible.getMaxHealth());
  }
}
