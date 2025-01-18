import { ClientPositionable } from "@/extensions";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { Z_INDEX } from "@shared/map";
import { RawEntity } from "@shared/types/entity";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";

export class FireExtinguisherClient extends ClientEntity implements Renderable {
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
    const image = this.imageLoader.get("fire_extinguisher");
    ctx.drawImage(image, position.x, position.y);
  }
}
