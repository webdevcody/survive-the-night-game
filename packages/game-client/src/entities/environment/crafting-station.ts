import { ClientPositionable } from "@/extensions";
import { ClientEntity } from "@/entities/client-entity";
import type { Renderable } from "@/entities/util";
import { Z_INDEX } from "@shared/map";
import type { RawEntity } from "@shared/types/entity";
import type { AssetManager } from "@/managers/asset";
import type { GameState } from "@/state";

export class CraftingStationClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const position = this.getExt(ClientPositionable).getPosition();
    const image = this.imageLoader.get(this.getType() as any);
    ctx.drawImage(image, position.x, position.y);
    super.render(ctx, gameState);
  }
}
