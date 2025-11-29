import { GameState, getEntitiesByType } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { AssetManager } from "@/managers/asset";
import { CrateClient } from "@/entities/items/crate";

export interface CrateIndicatorsPanelSettings extends PanelSettings {
  arrowSize: number;
  arrowDistance: number;
  arrowColor: string;
  crateSpriteSize: number;
  minDistance: number; // Minimum distance before showing indicator
}

export class CrateIndicatorsPanel extends Panel {
  private indicatorSettings: CrateIndicatorsPanelSettings;
  private assetManager: AssetManager;

  constructor(settings: CrateIndicatorsPanelSettings, assetManager: AssetManager) {
    super(settings);
    this.indicatorSettings = settings;
    this.assetManager = assetManager;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const player = getPlayer(gameState);
    if (!player || !player.hasExt(ClientPositionable)) {
      return;
    }

    const playerPos = player.getExt(ClientPositionable).getCenterPosition();
    const { width, height } = ctx.canvas;

    // Get all crates from the type-based map (more efficient than filtering all entities)
    const crates = getEntitiesByType(gameState, "crate").filter(
      (entity) => entity instanceof CrateClient && entity.hasExt(ClientPositionable)
    );

    this.resetTransform(ctx);

    // Get the crate sprite
    const crateSprite = this.assetManager.getFrameIndex("crate", 0);

    for (const crate of crates) {
      const cratePos = crate.getExt(ClientPositionable).getCenterPosition();

      // Calculate vector from player to crate
      const dx = cratePos.x - playerPos.x;
      const dy = cratePos.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Skip if crate is very close (player can see it)
      if (distance < this.indicatorSettings.minDistance) continue;

      // Normalize direction
      const dirX = dx / distance;
      const dirY = dy / distance;

      // Calculate screen position for indicator
      const centerX = width / 2;
      const centerY = height / 2;

      // Calculate angle
      const angle = Math.atan2(dy, dx);

      // Determine edge position
      let indicatorX = centerX;
      let indicatorY = centerY;

      // Calculate intersection with screen bounds
      const margin = this.indicatorSettings.arrowDistance;
      const maxX = width - margin;
      const maxY = height - margin;

      // Find intersection with screen edges
      const t1 = (maxX - centerX) / dirX; // Right edge
      const t2 = (margin - centerX) / dirX; // Left edge
      const t3 = (maxY - centerY) / dirY; // Bottom edge
      const t4 = (margin - centerY) / dirY; // Top edge

      // Find the smallest positive t (closest edge intersection)
      const validT = [t1, t2, t3, t4].filter((t) => t > 0);
      const t = Math.min(...validT);

      if (isFinite(t)) {
        indicatorX = centerX + dirX * t;
        indicatorY = centerY + dirY * t;
      }

      // Draw red arrow
      ctx.save();
      ctx.translate(indicatorX, indicatorY);
      ctx.rotate(angle);

      // Draw arrow shape
      ctx.fillStyle = this.indicatorSettings.arrowColor;
      ctx.beginPath();
      ctx.moveTo(this.indicatorSettings.arrowSize / 2, 0); // Arrow tip
      ctx.lineTo(-this.indicatorSettings.arrowSize / 2, -this.indicatorSettings.arrowSize / 3);
      ctx.lineTo(-this.indicatorSettings.arrowSize / 3, 0);
      ctx.lineTo(-this.indicatorSettings.arrowSize / 2, this.indicatorSettings.arrowSize / 3);
      ctx.closePath();
      ctx.fill();

      // Draw arrow outline
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Draw crate sprite next to arrow
      const spriteOffsetX = Math.cos(angle) * (this.indicatorSettings.arrowSize + 16);
      const spriteOffsetY = Math.sin(angle) * (this.indicatorSettings.arrowSize + 16);
      const spriteX = indicatorX + spriteOffsetX - this.indicatorSettings.crateSpriteSize / 2;
      const spriteY = indicatorY + spriteOffsetY - this.indicatorSettings.crateSpriteSize / 2;

      // Draw crate sprite (getFrameIndex returns a pre-cropped image)
      if (crateSprite) {
        ctx.drawImage(
          crateSprite,
          spriteX,
          spriteY,
          this.indicatorSettings.crateSpriteSize,
          this.indicatorSettings.crateSpriteSize
        );
      }

      // Convert distance from pixels to feet (1 pixel = 0.1 feet, so 10 pixels = 1 foot)
      const distanceInFeet = Math.round(distance * 0.1);
      const distanceText = `${distanceInFeet} ft`;

      // Draw distance text below the sprite
      ctx.save();
      ctx.font = "14px Arial";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 3;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      
      const textX = indicatorX + spriteOffsetX;
      const textY = spriteY + this.indicatorSettings.crateSpriteSize + 4;
      
      // Draw text outline for better visibility
      ctx.strokeText(distanceText, textX, textY);
      // Draw text
      ctx.fillText(distanceText, textX, textY);
      ctx.restore();
    }

    this.restoreContext(ctx);
  }
}
