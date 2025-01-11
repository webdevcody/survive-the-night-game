import { ClientPositionable } from "../../extensions";
import { AssetManager } from "../../managers/asset";
import { GameState } from "../../state";
import { Renderable } from "../util";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { ClientEntityBase } from "../../extensions/client-entity";
import { RawEntity } from "@survive-the-night/game-shared";

export class TorchClient extends ClientEntityBase implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const image = this.assetManager.get("torch");
    ctx.drawImage(image, position.x, position.y);
  }
}
