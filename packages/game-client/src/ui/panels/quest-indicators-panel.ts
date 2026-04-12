import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { distance } from "@shared/util/physics";
import PoolManager from "@shared/util/pool-manager";

export interface QuestIndicatorsPanelSettings extends PanelSettings {
  arrowSize: number;
  arrowDistance: number;
  arrowColor: string;
  minDistance: number;
}

export class QuestIndicatorsPanel extends Panel {
  private indicatorSettings: QuestIndicatorsPanelSettings;

  constructor(settings: QuestIndicatorsPanelSettings) {
    super(settings);
    this.indicatorSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const player = getPlayer(gameState);
    if (!player || !player.hasExt(ClientPositionable) || player.isZombiePlayer()) {
      return;
    }

    const target = gameState.questNavigationTarget;
    if (!target) {
      return;
    }

    const playerPos = player.getExt(ClientPositionable).getCenterPosition();
    const pool = PoolManager.getInstance();
    const targetVec = pool.vector2.claim(target.worldX, target.worldY);
    const playerVec = pool.vector2.claim(playerPos.x, playerPos.y);
    const dist = distance(targetVec, playerVec);
    pool.vector2.release(targetVec);
    pool.vector2.release(playerVec);

    if (dist < this.indicatorSettings.minDistance) {
      return;
    }

    const { width, height } = ctx.canvas;
    const dx = target.worldX - playerPos.x;
    const dy = target.worldY - playerPos.y;
    const dirX = dx / dist;
    const dirY = dy / dist;

    const centerX = width / 2;
    const centerY = height / 2;
    const angle = Math.atan2(dy, dx);

    const margin = this.indicatorSettings.arrowDistance;
    const maxX = width - margin;
    const maxY = height - margin;

    const t1 = (maxX - centerX) / dirX;
    const t2 = (margin - centerX) / dirX;
    const t3 = (maxY - centerY) / dirY;
    const t4 = (margin - centerY) / dirY;

    const validT = [t1, t2, t3, t4].filter((t) => t > 0);
    const t = Math.min(...validT);

    let indicatorX = centerX;
    let indicatorY = centerY;
    if (isFinite(t)) {
      indicatorX = centerX + dirX * t;
      indicatorY = centerY + dirY * t;
    }

    this.resetTransform(ctx);

    ctx.save();
    ctx.translate(indicatorX, indicatorY);
    ctx.rotate(angle);

    ctx.fillStyle = this.indicatorSettings.arrowColor;
    ctx.beginPath();
    ctx.moveTo(this.indicatorSettings.arrowSize / 2, 0);
    ctx.lineTo(-this.indicatorSettings.arrowSize / 2, -this.indicatorSettings.arrowSize / 3);
    ctx.lineTo(-this.indicatorSettings.arrowSize / 3, 0);
    ctx.lineTo(-this.indicatorSettings.arrowSize / 2, this.indicatorSettings.arrowSize / 3);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    const pulse = 0.85 + 0.15 * Math.sin(performance.now() / 280);
    const diamondR = 7;
    const ox = Math.cos(angle) * (this.indicatorSettings.arrowSize + 14);
    const oy = Math.sin(angle) * (this.indicatorSettings.arrowSize + 14);
    const hx = indicatorX + ox;
    const hy = indicatorY + oy;

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = `rgba(255, 230, 150, ${pulse})`;
    ctx.strokeStyle = "rgba(40, 30, 10, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-diamondR, -diamondR, diamondR * 2, diamondR * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const distanceInFeet = Math.round(dist * 0.1);
    ctx.save();
    ctx.font = "13px Arial";
    ctx.fillStyle = "rgba(255, 248, 220, 0.98)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.lineWidth = 3;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const textY = hy + diamondR + 6;
    ctx.strokeText(`${distanceInFeet} ft`, hx, textY);
    ctx.fillText(`${distanceInFeet} ft`, hx, textY);
    ctx.restore();

    this.restoreContext(ctx);
  }
}
