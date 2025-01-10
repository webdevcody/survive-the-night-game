import { Interactive, Positionable } from "@survive-the-night/game-server";
import { RawEntity } from "@survive-the-night/game-shared";
import { GameState } from "../state";
import { Renderable } from "./util";
import { getPlayer } from "../util/get-player";
import { renderInteractionText } from "../util/interaction-text";
import { ClientEntityBase } from "../extensions/client-entity";
import { AssetManager } from "../managers/asset";

export abstract class ClientEntity extends ClientEntityBase implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  abstract getZIndex(): number;

  protected renderInteractionText(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const myPlayer = getPlayer(gameState);
    const positionable = this.getExt(Positionable);
    const interactive = this.getExt(Interactive);

    if (myPlayer && interactive.getDisplayName()) {
      renderInteractionText(
        ctx,
        `${interactive.getDisplayName()} (e)`,
        positionable.getCenterPosition(),
        positionable.getPosition(),
        myPlayer.getCenterPosition()
      );
    }
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (this.getExt(Interactive)) {
      this.renderInteractionText(ctx, gameState);
    }
  }
}
