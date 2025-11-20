import { GameState, getEntitiesByType } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { AssetManager } from "@/managers/asset";
import { SurvivorClient } from "@/entities/environment/survivor";

export interface SurvivorIndicatorsPanelSettings extends PanelSettings {
  arrowSize: number;
  arrowDistance: number;
  arrowColor: string;
  survivorSpriteSize: number;
  minDistance: number; // Minimum distance before showing indicator
}

export class SurvivorIndicatorsPanel extends Panel {
  private indicatorSettings: SurvivorIndicatorsPanelSettings;
  private assetManager: AssetManager;

  constructor(settings: SurvivorIndicatorsPanelSettings, assetManager: AssetManager) {
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

    // Get all survivors from the type-based map (more efficient than filtering all entities)
    const survivors = getEntitiesByType(gameState, "survivor").filter(
      (entity) => entity instanceof SurvivorClient && entity.hasExt(ClientPositionable)
    );

    this.resetTransform(ctx);

    // Get the survivor sprite
    const survivorSprite = this.assetManager.getWithDirection("survivor", "down");

    for (const survivor of survivors) {
      const survivorPos = survivor.getExt(ClientPositionable).getCenterPosition();

      // Calculate vector from player to survivor
      const dx = survivorPos.x - playerPos.x;
      const dy = survivorPos.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Skip if survivor is very close (player can see it)
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

      // Draw arrow
      ctx.save();
      ctx.translate(indicatorX, indicatorY);
      ctx.rotate(angle);

      // Draw arrow shape
      ctx.fillStyle = this.indicatorSettings.arrowColor;
      ctx.beginPath();
      ctx.moveTo(this.indicatorSettings.arrowSize / 2, 0); // Arrow tip
      ctx.lineTo(
        -this.indicatorSettings.arrowSize / 2,
        -this.indicatorSettings.arrowSize / 3
      );
      ctx.lineTo(-this.indicatorSettings.arrowSize / 3, 0);
      ctx.lineTo(
        -this.indicatorSettings.arrowSize / 2,
        this.indicatorSettings.arrowSize / 3
      );
      ctx.closePath();
      ctx.fill();

      // Draw arrow outline
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Draw survivor sprite next to arrow
      const spriteOffsetX = Math.cos(angle) * (this.indicatorSettings.arrowSize + 16);
      const spriteOffsetY = Math.sin(angle) * (this.indicatorSettings.arrowSize + 16);
      const spriteX = indicatorX + spriteOffsetX - this.indicatorSettings.survivorSpriteSize / 2;
      const spriteY = indicatorY + spriteOffsetY - this.indicatorSettings.survivorSpriteSize / 2;

      // Draw survivor sprite
      if (survivorSprite) {
        ctx.drawImage(
          survivorSprite,
          spriteX,
          spriteY,
          this.indicatorSettings.survivorSpriteSize,
          this.indicatorSettings.survivorSpriteSize
        );
      }
    }

    this.restoreContext(ctx);
  }
}

