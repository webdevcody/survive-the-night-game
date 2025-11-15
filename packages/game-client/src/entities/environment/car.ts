import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { Renderable, drawHealthBar } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { ClientPositionable, ClientDestructible, ClientInteractive } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { getPlayer } from "@/util/get-player";
import { renderInteractionText } from "@/util/interaction-text";
import { getConfig } from "@shared/config";
import { formatDisplayName } from "@/util/format";

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

  protected renderInteractionText(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    // Only show interaction text if the car is damaged and has the interactive extension
    if (this.getHealth() >= this.getMaxHealth() || !this.hasExt(ClientInteractive)) {
      return;
    }

    const myPlayer = getPlayer(gameState);
    const positionable = this.getExt(ClientPositionable);
    const interactive = this.getExt(ClientInteractive);

    if (myPlayer && interactive.getDisplayName()) {
      const displayName = formatDisplayName(interactive.getDisplayName());
      let text = `${displayName} (${getConfig().keybindings.INTERACT})`;

      renderInteractionText(
        ctx,
        text,
        positionable.getCenterPosition(),
        positionable.getPosition(),
        myPlayer.getCenterPosition(),
        interactive.getOffset()
      );
    }
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
