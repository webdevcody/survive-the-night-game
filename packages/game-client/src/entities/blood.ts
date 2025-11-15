import { ClientPositionable } from "@/extensions";
import { ClientEntityBase } from "@/extensions/client-entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { RawEntity } from "@shared/types/entity";
import { Z_INDEX } from "@shared/map";
import { Renderable } from "@/entities/util";

export class BloodClient extends ClientEntityBase implements Renderable {
  private createdAt: number;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.createdAt = Date.now();
  }

  public getZIndex(): number {
    return Z_INDEX.DECALS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();

    // Calculate opacity: fade from 1.0 to 0.0 over 10 seconds
    const elapsed = Date.now() - this.createdAt;
    const opacity = Math.max(0, (10000 - elapsed) / 10000);

    // Don't render if fully faded
    if (opacity <= 0) {
      return;
    }

    try {
      // Use blood sprite from decal registry (asset is auto-generated from decal-configs.ts)
      const image = this.getImage();

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(image, position.x, position.y);
      ctx.globalAlpha = 1.0;
      ctx.restore();
    } catch (error) {
      // Asset not found - silently skip rendering
    }
  }
}
