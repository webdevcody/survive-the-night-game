import { RawEntity } from "@shared/types/entity";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { ImageLoader } from "@/managers/asset";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { weaponRegistry } from "@shared/entities";
import { Asset } from "@/managers/asset";

export class ThrowingKnifeClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, imageLoader: ImageLoader) {
    super(data, imageLoader);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public getImage(): HTMLImageElement {
    // For weapons, use the assetPrefix from weapon config instead of entity type
    const weaponConfig = weaponRegistry.get(this.getType() as any);
    if (weaponConfig) {
      return this.imageLoader.get(weaponConfig.assets.assetPrefix as Asset);
    }
    return super.getImage();
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
    const image = this.getImage();
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    ctx.drawImage(image, position.x, position.y);
  }
}
