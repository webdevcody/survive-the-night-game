import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { ItemConfig } from "@shared/entities/item-registry";

/**
 * Generic client entity that auto-renders assets from ItemConfig
 * Used as a fallback when no custom client entity class exists
 */
export class GenericClientEntity extends ClientEntity implements Renderable {
  private config: ItemConfig;

  constructor(data: RawEntity, assetManager: AssetManager, config: ItemConfig) {
    super(data, assetManager);
    this.config = config;
  }

  public getZIndex(): number {
    // Structures render at BUILDINGS layer, others at ITEMS layer
    return this.config.category === "structure" ? Z_INDEX.BUILDINGS : Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();

    try {
      const image = this.getImage();
      ctx.drawImage(image, position.x, position.y);
    } catch (error) {
      // Asset not found - might be a custom entity that needs a custom class
      // Or uses a special sheet (like "collidables") that isn't in the standard asset system
      // Silently skip rendering - these entities should have custom client classes
      // console.warn(`Failed to render generic entity ${this.config.id}:`, error);
    }
  }
}
