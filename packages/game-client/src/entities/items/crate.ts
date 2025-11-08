import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { Renderable, drawHealthBar, getFrameIndex } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { ClientPositionable, ClientDestructible } from "@/extensions";
import { Z_INDEX } from "@shared/map";

export class CrateClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.BUILDINGS;
  }

  private getHealth(): number {
    const destructible = this.getExt(ClientDestructible);
    return destructible.getHealth();
  }

  private getMaxHealth(): number {
    const destructible = this.getExt(ClientDestructible);
    return destructible.getMaxHealth();
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const frameIndexHealthMap = {
      [1]: 2,
      [2]: 1,
      [3]: 0,
    };
    const frameIndex = frameIndexHealthMap[this.getHealth() as keyof typeof frameIndexHealthMap];
    const image = this.imageLoader.getFrameIndex("crate", frameIndex);
    ctx.drawImage(image, position.x, position.y);

    drawHealthBar(ctx, position, this.getHealth(), this.getMaxHealth());
  }
}
