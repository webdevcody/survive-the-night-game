import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { roundVector2 } from "@shared/util/physics";
import PoolManager from "@shared/util/pool-manager";

/**
 * Client entity for toxic biome zone - a large zone covering an entire biome
 */
export class ToxicBiomeZoneClient extends ClientEntity implements Renderable {
  public constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.PROJECTILES;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.hasExt(ClientPositionable)) return;

    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const size = positionable.getSize();

    // Render at full opacity immediately - no fade in
    const opacity = 0.7;
    const greenIntensity = 200;

    // Round position to prevent sub-pixel rendering offsets
    const poolManager = PoolManager.getInstance();
    const roundedPosition = roundVector2(position);

    // Render as transparent green rectangle
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = `rgba(0, ${greenIntensity}, 0, ${opacity})`;
    ctx.fillRect(roundedPosition.x, roundedPosition.y, size.x + 1, size.y + 1);
    ctx.restore();

    // Release pooled vectors
    poolManager.vector2.release(position);
    poolManager.vector2.release(roundedPosition);
  }
}
