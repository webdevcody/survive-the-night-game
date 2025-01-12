import { GameState } from "../../state";
import { Renderable } from "../util";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { ClientEntity } from "../../entities/client-entity";
import { ClientPositionable } from "../../extensions";

export class TreeClient extends ClientEntity implements Renderable {
  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const image = this.imageLoader.get("tree");
    ctx.drawImage(image, position.x, position.y);
  }
}
