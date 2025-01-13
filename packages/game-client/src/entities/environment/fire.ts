import { AssetManager } from "../../managers/asset";
import { GameState } from "../../state";
import { getFrameIndex, Renderable } from "../util";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { ClientEntityBase } from "../../extensions/client-entity";
import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";
import { ClientPositionable } from "../../extensions";

export class FireClient extends ClientEntityBase implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const frameIndex = getFrameIndex(gameState.startedAt, {
      duration: 500,
      frames: 5,
    });
    const image = this.imageLoader.getFrameIndex("flame", frameIndex);
    ctx.drawImage(image, position.x, position.y);
  }
}
