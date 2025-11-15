import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
export class WoodClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const image = this.getImage();
    const position = this.getExt(ClientPositionable).getPosition();
    ctx.drawImage(image, position.x, position.y);
  }
}

