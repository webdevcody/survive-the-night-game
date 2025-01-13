import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";
import { GameState } from "../state";
import { Renderable } from "./util";
import { getPlayer } from "../util/get-player";
import { renderInteractionText } from "../util/interaction-text";
import { ClientEntityBase } from "../extensions/client-entity";
import { ImageLoader } from "../managers/asset";
import { ClientInteractive, ClientPositionable } from "../extensions";

export abstract class ClientEntity extends ClientEntityBase implements Renderable {
  constructor(data: RawEntity, imageLoader: ImageLoader) {
    super(data, imageLoader);
  }

  abstract getZIndex(): number;

  protected renderInteractionText(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const myPlayer = getPlayer(gameState);
    const positionable = this.getExt(ClientPositionable);
    const interactive = this.getExt(ClientInteractive);

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
    if (this.getExt(ClientInteractive)) {
      this.renderInteractionText(ctx, gameState);
    }
  }
}
