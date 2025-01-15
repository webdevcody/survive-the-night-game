import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "../../state";
import { Z_INDEX } from "@server/managers/map-manager";
import { ClientEntity } from "../../entities/client-entity";
import { Renderable } from "../util";
import { ClientPositionable } from "../../extensions";

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
