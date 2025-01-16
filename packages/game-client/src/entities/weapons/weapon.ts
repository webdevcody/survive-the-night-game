import { RawEntity } from "@shared/types/entity";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { ClientPositionable } from "@/extensions";
import { ImageLoader } from "@/managers/asset";
import { WeaponType } from "@shared/types/weapons";
import { Z_INDEX } from "@shared/map";

export class WeaponClient extends ClientEntity implements Renderable {
  private weaponType: WeaponType;

  constructor(data: RawEntity, assetManager: ImageLoader) {
    super(data, assetManager);
    this.weaponType = data.weaponType;
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
    const image = this.imageLoader.get(this.weaponType);
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    ctx.drawImage(image, position.x, position.y);
  }
}
