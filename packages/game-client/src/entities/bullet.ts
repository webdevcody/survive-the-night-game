import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { IClientEntity, Renderable } from "@/entities/util";
import { GameState } from "@/state";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientPositionable } from "@/extensions/positionable";
import { Z_INDEX } from "@shared/map";
import Vector2 from "@shared/util/vector2";
import { roundVector2 } from "@shared/util/physics";

export class BulletClient extends ClientEntityBase implements IClientEntity, Renderable {
  private readonly BULLET_SIZE = 4;
  private readonly LERP_FACTOR = 0.4; // Higher value = faster interpolation
  private lastRenderPosition: Vector2;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.lastRenderPosition = this.getPosition();
  }

  getPosition(): Vector2 {
    return this.getExt(ClientPositionable).getPosition();
  }

  setPosition(position: Vector2): void {
    this.getExt(ClientPositionable).setPosition(position);
  }

  public getZIndex(): number {
    return Z_INDEX.PROJECTILES;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    // Interpolate position
    const targetPosition = this.getPosition();
    this.lastRenderPosition = new Vector2(
      this.lastRenderPosition.x + (targetPosition.x - this.lastRenderPosition.x) * this.LERP_FACTOR,
      this.lastRenderPosition.y + (targetPosition.y - this.lastRenderPosition.y) * this.LERP_FACTOR
    );

    const renderPosition = roundVector2(this.lastRenderPosition);

    // Draw yellow outer bullet
    ctx.beginPath();
    ctx.fillStyle = "yellow";
    ctx.arc(
      renderPosition.x + this.BULLET_SIZE / 2,
      renderPosition.y + this.BULLET_SIZE / 2,
      this.BULLET_SIZE / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw red center
    ctx.beginPath();
    ctx.fillStyle = "red";
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
