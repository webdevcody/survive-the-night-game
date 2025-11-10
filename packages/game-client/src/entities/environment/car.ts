import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { Renderable, drawHealthBar } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { ClientPositionable, ClientDestructible } from "@/extensions";
import { Z_INDEX } from "@shared/map";

export class CarClient extends ClientEntity implements Renderable {
  private static collidablesSheet: HTMLImageElement | null = null;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);

    // Load the collidables sheet if not already loaded
    if (!CarClient.collidablesSheet) {
      CarClient.collidablesSheet = new Image();
      CarClient.collidablesSheet.src = "/sheets/collidables.png";
    }
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

    // Car sprite is at x=16, y=352 in collidables sheet, 2 tiles wide (32px), 1 tile tall (16px)
    if (CarClient.collidablesSheet && CarClient.collidablesSheet.complete) {
      const sourceX = 16;
      const sourceY = 352;
      const sourceWidth = 32;
      const sourceHeight = 16;

      ctx.drawImage(
        CarClient.collidablesSheet,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        position.x,
        position.y,
        sourceWidth,
        sourceHeight
      );
    }

    drawHealthBar(ctx, position, this.getHealth(), this.getMaxHealth(), 32);
  }
}
