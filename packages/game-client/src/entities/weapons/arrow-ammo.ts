import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { Z_INDEX } from "@shared/map";
import { ClientEntity } from "@/entities/client-entity";
import { RawEntity } from "@shared/types/entity";
import { ClientPositionable } from "@/extensions";

export class ArrowAmmoClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const image = this.getImage();
    ctx.drawImage(image, position.x, position.y);
  }
}

