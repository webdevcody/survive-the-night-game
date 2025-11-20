import { GameState, getEntitiesByType } from "@/state";
import { PlayerClient } from "@/entities/player";
import { Entities } from "@shared/constants";

const LEADERBOARD_SETTINGS = {
  background: "rgba(20, 20, 20, 0.95)",
  color: "#ffffff",
  headerBackground: "rgba(40, 40, 40, 0.95)",
  font: "24px 'Arial'",
  lineHeight: 60,
  padding: {
    bottom: 32,
    left: 40,
    right: 40,
    top: 32,
  },
  title: "Players Online",
  titleFont: "bold 32px 'Arial'",
  rowBackground: {
    even: "rgba(40, 40, 40, 0.3)",
    odd: "rgba(40, 40, 40, 0.1)",
  },
  killCount: {
    color: "#ffd700",
    font: "bold 24px 'Arial'",
  },
  ping: {
    excellent: "rgb(0, 255, 0)", // Green: < 50ms
    good: "rgb(255, 255, 0)", // Yellow: 50-100ms
    fair: "rgb(255, 165, 0)", // Orange: 100-150ms
    poor: "rgb(255, 0, 0)", // Red: > 150ms
    font: "20px 'Arial'",
    width: 80,
  },
  borderRadius: 12,
};

export class Leaderboard {
  private show: boolean = false;

  public setShow(show: boolean): void {
    this.show = show;
  }

  public isShowing(): boolean {
    return this.show;
  }

  private getPingColor(ping: number): string {
    if (ping < 50) return LEADERBOARD_SETTINGS.ping.excellent;
    if (ping < 100) return LEADERBOARD_SETTINGS.ping.good;
    if (ping < 150) return LEADERBOARD_SETTINGS.ping.fair;
    return LEADERBOARD_SETTINGS.ping.poor;
  }

  // Helper method for drawing rounded rectangles
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    topRounded: boolean = true,
    bottomRounded: boolean = true
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    if (topRounded) {
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    } else {
      ctx.lineTo(x + width, y);
    }
    ctx.lineTo(x + width, y + height - radius);
    if (bottomRounded) {
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    } else {
      ctx.lineTo(x + width, y + height);
    }
    ctx.lineTo(x + radius, y + height);
    if (bottomRounded) {
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    } else {
      ctx.lineTo(x, y + height);
    }
    ctx.lineTo(x, y + radius);
    if (topRounded) {
      ctx.quadraticCurveTo(x, y, x + radius, y);
    } else {
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.show) return;

    const settings = LEADERBOARD_SETTINGS;
    const players = getEntitiesByType(gameState, Entities.PLAYER) as PlayerClient[];
    if (players.length === 0) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Calculate dimensions
    ctx.font = settings.font;
    let maxWidth = 600; // Increased minimum width to accommodate ping

    // Calculate player list width
    players.forEach((player) => {
      const displayName = player.getDisplayName();
      const killText = `${player.getKills()}`;
      const metrics = ctx.measureText(displayName);
      const killMetrics = ctx.measureText(killText);
      maxWidth = Math.max(maxWidth, metrics.width + killMetrics.width + settings.ping.width + 120); // Extra padding
    });

    const width = maxWidth + settings.padding.left + settings.padding.right;
    const height =
      settings.padding.top + settings.padding.bottom + settings.lineHeight * (players.length + 1);

    // Center the overlay
    const x = (ctx.canvas.width - width) / 2;
    const y = (ctx.canvas.height - height) / 2;

    // Draw main background with rounded corners
    ctx.fillStyle = settings.background;
    this.roundRect(ctx, x, y, width, height, settings.borderRadius);

    // Draw header background
    ctx.fillStyle = settings.headerBackground;
    this.roundRect(
      ctx,
      x,
      y,
      width,
      settings.lineHeight + settings.padding.top,
      settings.borderRadius,
      true,
      false
    );

    // Draw title
    ctx.fillStyle = settings.color;
    ctx.font = settings.titleFont;
    ctx.textBaseline = "middle";
    ctx.fillText(
      settings.title,
      x + settings.padding.left,
      y + (settings.lineHeight + settings.padding.top) / 2
    );

    // Draw player list
    ctx.textBaseline = "middle";
    players.forEach((player, index) => {
      const rowY = y + settings.lineHeight * (index + 1) + settings.padding.top;

      // Draw row background
      ctx.fillStyle = index % 2 === 0 ? settings.rowBackground.even : settings.rowBackground.odd;
      ctx.fillRect(x, rowY, width, settings.lineHeight);

      // Draw player ID
      ctx.font = settings.font;
      ctx.fillStyle = settings.color;
      ctx.fillText(
        player.getDisplayName(),
        x + settings.padding.left,
        rowY + settings.lineHeight / 2
      );

      // Draw ping with color based on value
      const ping = player.getPing();
      const pingText = `${ping}ms`;
      ctx.font = settings.ping.font;
      ctx.fillStyle = this.getPingColor(ping);
      const pingX = x + width - settings.padding.right - settings.ping.width;
      ctx.fillText(pingText, pingX, rowY + settings.lineHeight / 2);

      // Draw kill count with custom styling
      const killText = `${player.getKills()} kills`;
      ctx.font = settings.killCount.font;
      ctx.fillStyle = settings.killCount.color;
      const killMetrics = ctx.measureText(killText);
      ctx.fillText(
        killText,
        pingX - killMetrics.width - 40, // Position kills before ping
        rowY + settings.lineHeight / 2
      );
    });

    ctx.restore();
  }
}
