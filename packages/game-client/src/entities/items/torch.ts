import {
  GenericEntity,
  Player,
  Positionable,
  RawEntity,
  distance,
} from "@survive-the-night/game-server";
import { GameState } from "../../state";
import { Renderable } from "../util";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { getPlayer } from "../../util/get-player";
import { AssetManager } from "@/managers/asset";
import { renderInteractionText } from "../../util/interaction-text";

export class TorchClient extends GenericEntity implements Renderable {
  private assetManager: AssetManager;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data);
    this.assetManager = assetManager;
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get("torch");
    const myPlayer = getPlayer(gameState);
    const positionable = this.getExt(Positionable);
    const centerPosition = positionable.getCenterPosition();
    const position = positionable.getPosition();

    if (myPlayer) {
      renderInteractionText(ctx, "collect (e)", centerPosition, position, myPlayer.getPosition());
    }

    ctx.drawImage(image, position.x, position.y);
  }
}
