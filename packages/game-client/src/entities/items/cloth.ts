import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "../../state";
import { ClientEntity } from "../../entities/client-entity";
import { Renderable } from "../util";
import { ClientPositionable } from "../../extensions";
import { Z_INDEX } from "@shared/map";
export class ClothClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const image = this.imageLoader.get("cloth");
    const position = this.getExt(ClientPositionable).getPosition();
    ctx.drawImage(image, position.x, position.y);
  }
}
