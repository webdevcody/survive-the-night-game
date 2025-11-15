import { ClientPositionable } from "@/extensions";
import { ClientEntityBase } from "@/extensions/client-entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { RawEntity } from "@shared/types/entity";
import { Z_INDEX } from "@shared/map";
import { Renderable, getFrameIndex } from "@/entities/util";

export class CampsiteFireClient extends ClientEntityBase implements Renderable {
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
    // Use entity type to get the campsite_fire assets from the ground sheet
    const image = this.imageLoader.getFrameIndex(this.getType(), frameIndex);
    ctx.drawImage(image, position.x, position.y);
  }
}
