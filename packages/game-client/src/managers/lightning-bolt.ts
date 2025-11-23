import { GameClient } from "@/client";
import { getEntityById } from "@/state";
import { ClientPositionable } from "@/extensions/positionable";

interface ActiveLightningBolt {
  playerId: number;
  startTime: number;
  duration: number;
  path: { x: number; y: number }[];
}

export class LightningBoltManager {
  private gameClient: GameClient;
  private activeBolts: ActiveLightningBolt[] = [];
  private readonly BOLT_DURATION = 200; // Duration in milliseconds

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
  }

  /**
   * Generate a jagged lightning path
   */
  private generateLightningPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] {
    const segments = 8; // Number of segments in the bolt
    const points: { x: number; y: number }[] = [];

    // Start point
    points.push({ x: startX, y: startY });

    // Generate intermediate points with random offsets
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const baseX = startX + (endX - startX) * t;
      const baseY = startY + (endY - startY) * t;

      // Add random offset for jagged effect
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 10;

      points.push({
        x: baseX + offsetX,
        y: baseY + offsetY,
      });
    }

    // End point
    points.push({ x: endX, y: endY });

    return points;
  }

  /**
   * Trigger a lightning bolt visual effect on a player
   */
  public triggerBolt(playerId: number): void {
    // Get the player entity to generate path
    const player = getEntityById(this.gameClient.getGameState(), playerId);
    if (!player || !player.hasExt(ClientPositionable)) {
      return;
    }

    const playerPos = player.getExt(ClientPositionable).getCenterPosition();
    const boltHeight = 300; // Height of the bolt above the player
    const startY = playerPos.y - boltHeight;
    const endY = playerPos.y;

    // Generate path once when bolt is created
    const path = this.generateLightningPath(playerPos.x, startY, playerPos.x, endY);

    this.activeBolts.push({
      playerId,
      startTime: Date.now(),
      duration: this.BOLT_DURATION,
      path,
    });
  }

  /**
   * Update and remove expired bolts
   */
  public update(): void {
    const currentTime = Date.now();
    this.activeBolts = this.activeBolts.filter(
      (bolt) => currentTime - bolt.startTime < bolt.duration
    );
  }

  /**
   * Render all active lightning bolts
   */
  public render(ctx: CanvasRenderingContext2D): void {
    const currentTime = Date.now();

    for (const bolt of this.activeBolts) {
      const elapsed = currentTime - bolt.startTime;
      const progress = Math.min(elapsed / bolt.duration, 1.0);

      // Get the player entity
      const player = getEntityById(this.gameClient.getGameState(), bolt.playerId);
      if (!player || !player.hasExt(ClientPositionable)) {
        continue;
      }

      const playerPos = player.getExt(ClientPositionable).getCenterPosition();

      // Fade out as the bolt disappears
      const alpha = 1.0 - progress;

      // Translate the path to follow the player's current position
      // The path was generated relative to the player's position when struck
      // We need to adjust it to the current player position
      const adjustedPath = bolt.path.map((point) => ({
        x: point.x - (bolt.path[0].x - playerPos.x), // Adjust X to player's current X
        y: point.y - (bolt.path[bolt.path.length - 1].y - playerPos.y), // Adjust Y so end is at player
      }));

      // Draw the adjusted path
      this.drawLightningBolt(ctx, adjustedPath, alpha);
    }
  }

  /**
   * Draw a jagged lightning bolt using a pre-generated path
   */
  private drawLightningBolt(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    alpha: number
  ): void {
    ctx.save();

    // Draw main bolt (white/blue core)
    ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`; // Light blue-white
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Draw outer glow (brighter blue)
    ctx.strokeStyle = `rgba(150, 200, 255, ${alpha * 0.6})`; // Brighter blue
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Draw inner bright core (white)
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`; // White core
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.restore();
  }
}

