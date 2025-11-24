import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { Renderable, drawHealthBar } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { ClientPositionable, ClientDestructible } from "@/extensions";
import { Z_INDEX } from "@shared/map";

export class WallLevel2Client extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.BUILDINGS;
  }

  private getHealth(): number {
    if (!this.hasExt(ClientDestructible)) {
      console.warn(`WallLevel2 ${this.getId()} does not have destructible extension`);
      return 0;
    }
    const destructible = this.getExt(ClientDestructible);
    return destructible.getHealth();
  }

  private getMaxHealth(): number {
    if (!this.hasExt(ClientDestructible)) {
      console.warn(`WallLevel2 ${this.getId()} does not have destructible extension`);
      return 0;
    }
    const destructible = this.getExt(ClientDestructible);
    return destructible.getMaxHealth();
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const image = this.getImage();
    ctx.drawImage(image, position.x, position.y);

    if (this.hasExt(ClientDestructible)) {
      drawHealthBar(ctx, position, this.getHealth(), this.getMaxHealth());
    }
  }
}
