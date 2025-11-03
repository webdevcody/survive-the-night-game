import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { IClientEntity, Renderable } from "@/entities/util";
import { GameState } from "@/state";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientPositionable, ClientMovable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import Vector2 from "@shared/util/vector2";
import { roundVector2 } from "@shared/util/physics";
import { getFrameIndex } from "@/entities/util";

export class FlameProjectileClient extends ClientEntityBase implements IClientEntity, Renderable {
  private readonly FLAME_SIZE = 16;
  private lastRenderPosition = { x: 0, y: 0 };
  private createdAt: number;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.createdAt = Date.now();
  }

  public getZIndex(): number {
    return Z_INDEX.PROJECTILES;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const targetPosition = this.getExt(ClientPositionable).getPosition();

    // Interpolate position for smooth movement
    this.lastRenderPosition = this.lerpPosition(
      targetPosition,
      new Vector2(this.lastRenderPosition.x, this.lastRenderPosition.y)
    );

    const renderPosition = roundVector2(
      new Vector2(this.lastRenderPosition.x, this.lastRenderPosition.y)
    );

    // Use flame animation if available, otherwise draw a simple orange/yellow circle
    try {
      const frameIndex = getFrameIndex(this.createdAt, {
        duration: 500,
        frames: 5,
      });
      const flameImage = this.imageLoader.getFrameIndex("flame", frameIndex);
      const scaledSize = this.FLAME_SIZE / 2;
      ctx.drawImage(flameImage, renderPosition.x, renderPosition.y, scaledSize, scaledSize);
    } catch {
      // Fallback: draw animated fire effect
      const elapsed = Date.now() - this.createdAt;
      const cycle = (elapsed % 200) / 200; // 200ms cycle
      const baseSize = this.FLAME_SIZE / 2;
      const size = baseSize * (0.8 + 0.2 * Math.sin(cycle * Math.PI * 2));

      // Outer glow (orange-red)
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, ${100 + Math.floor(cycle * 50)}, 0, 0.6)`;
      ctx.arc(
        renderPosition.x + this.FLAME_SIZE / 2,
        renderPosition.y + this.FLAME_SIZE / 2,
        size / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Inner core (yellow-white)
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, ${150 + Math.floor(cycle * 50)}, 0.8)`;
      ctx.arc(
        renderPosition.x + this.FLAME_SIZE / 2,
        renderPosition.y + this.FLAME_SIZE / 2,
        size / 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
}
