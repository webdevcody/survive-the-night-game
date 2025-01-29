import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { IClientEntity, Renderable } from "@/entities/util";
import { GameState } from "@/state";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientPositionable, ClientMovable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import Vector2 from "@shared/util/vector2";
import { roundVector2 } from "@shared/util/physics";

export class AcidProjectileClient extends ClientEntityBase implements IClientEntity, Renderable {
  private readonly BULLET_SIZE = 8;
  private lastRenderPosition = { x: 0, y: 0 };

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
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

    // Draw green outer circle
    ctx.beginPath();
    ctx.fillStyle = "#00ff00";
    ctx.arc(
      renderPosition.x + this.BULLET_SIZE / 2,
      renderPosition.y + this.BULLET_SIZE / 2,
      this.BULLET_SIZE / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw red inner circle
    ctx.beginPath();
    ctx.fillStyle = "#ff0000";
    ctx.arc(
      renderPosition.x + this.BULLET_SIZE / 2,
      renderPosition.y + this.BULLET_SIZE / 2,
      this.BULLET_SIZE / 4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}
