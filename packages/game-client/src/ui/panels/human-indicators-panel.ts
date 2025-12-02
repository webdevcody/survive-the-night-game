import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { AssetManager } from "@/managers/asset";
import { PlayerClient } from "@/entities/player";
import { distance } from "@shared/util/physics";
import { Direction } from "@shared/util/direction";

export interface HumanIndicatorsPanelSettings extends PanelSettings {
  arrowSize: number;
  arrowDistance: number;
  arrowColor: string;
  playerSpriteSize: number;
  minDistance: number; // Minimum distance before showing indicator
}

export class HumanIndicatorsPanel extends Panel {
  private indicatorSettings: HumanIndicatorsPanelSettings;
  private assetManager: AssetManager;

  constructor(settings: HumanIndicatorsPanelSettings, assetManager: AssetManager) {
    super(settings);
    this.indicatorSettings = settings;
    this.assetManager = assetManager;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const player = getPlayer(gameState);
    if (!player || !player.hasExt(ClientPositionable)) {
      return;
    }

    // Only show for zombie players in infection or battle royale modes
    const isInfection = gameState.gameMode === "infection";
    const isBattleRoyale = gameState.gameMode === "battle_royale";
    const isZombiePlayer = player.isZombiePlayer();

    // Only render indicators for zombie players in these modes
    if (!isZombiePlayer || (!isInfection && !isBattleRoyale)) {
      return;
    }

    const playerPos = player.getExt(ClientPositionable).getCenterPosition();
    const { width, height } = ctx.canvas;

    // Get all human players (non-zombie players that are not the current player)
    const humanPlayers = gameState.entities.filter(
      (entity) =>
        entity instanceof PlayerClient &&
        entity.getId() !== gameState.playerId &&
        !entity.isZombiePlayer() &&
        entity.hasExt(ClientPositionable) &&
        !entity.isDead()
    ) as PlayerClient[];

    this.resetTransform(ctx);

    // Get the player sprite for display
    const humanSprite = this.assetManager.getWithDirection("player", Direction.Down);

    for (const human of humanPlayers) {
      const humanPos = human.getExt(ClientPositionable).getCenterPosition();

      // Calculate vector from player to human
      const dist = distance(humanPos, playerPos);

      // Skip if human is very close (player can see it)
      if (dist < this.indicatorSettings.minDistance) continue;

      // Normalize direction
      const dx = humanPos.x - playerPos.x;
      const dy = humanPos.y - playerPos.y;
      const dirX = dx / dist;
      const dirY = dy / dist;

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

      // Draw player sprite next to arrow
      const spriteOffsetX = Math.cos(angle) * (this.indicatorSettings.arrowSize + 16);
      const spriteOffsetY = Math.sin(angle) * (this.indicatorSettings.arrowSize + 16);
      const spriteX = indicatorX + spriteOffsetX - this.indicatorSettings.playerSpriteSize / 2;
      const spriteY = indicatorY + spriteOffsetY - this.indicatorSettings.playerSpriteSize / 2;

      // Draw human player sprite
      if (humanSprite) {
        ctx.drawImage(
          humanSprite,
          spriteX,
          spriteY,
          this.indicatorSettings.playerSpriteSize,
          this.indicatorSettings.playerSpriteSize
        );
      }

      // Draw player name above the sprite if available
      const displayName = human.getDisplayName();
      if (displayName) {
        ctx.save();
        ctx.font = "12px Arial";
        ctx.fillStyle = "white";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineWidth = 3;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        const nameX = indicatorX + spriteOffsetX;
        const nameY = spriteY - 4;

        // Draw text outline for better visibility
        ctx.strokeText(displayName, nameX, nameY);
        // Draw text
        ctx.fillText(displayName, nameX, nameY);
        ctx.restore();
      }

      // Convert distance from pixels to feet (1 pixel = 0.1 feet, so 10 pixels = 1 foot)
      const distanceInFeet = Math.round(dist * 0.1);
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
      const textY = spriteY + this.indicatorSettings.playerSpriteSize + 4;

      // Draw text outline for better visibility
      ctx.strokeText(distanceText, textX, textY);
      // Draw text
      ctx.fillText(distanceText, textX, textY);
      ctx.restore();
    }

    this.restoreContext(ctx);
  }
}
