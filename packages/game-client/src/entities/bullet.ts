import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { IClientEntity, Renderable } from "@/entities/util";
import { GameState } from "@/state";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientPositionable } from "@/extensions/positionable";
import { Z_INDEX } from "@shared/map";
import Vector2 from "@shared/util/vector2";
import { roundVector2 } from "@shared/util/physics";
import { debugDrawHitbox } from "@/util/debug";
import { ClientCollidable } from "@/extensions";
import { BULLET_SIZE } from "@shared/constants";

export class BulletClient extends ClientEntityBase implements IClientEntity, Renderable {
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
    this.lastRenderPosition = this.lerpPosition(
      targetPosition,
      new Vector2(this.lastRenderPosition.x, this.lastRenderPosition.y)
    );

    const renderPosition = roundVector2(this.lastRenderPosition);

    // Draw yellow outer bullet
    ctx.beginPath();
    ctx.fillStyle = "yellow";
    ctx.arc(
      renderPosition.x + BULLET_SIZE / 2,
      renderPosition.y + BULLET_SIZE / 2,
      BULLET_SIZE / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw red center
    ctx.beginPath();
    ctx.fillStyle = "red";
    ctx.arc(
      renderPosition.x + BULLET_SIZE / 2,
      renderPosition.y + BULLET_SIZE / 2,
      BULLET_SIZE / 4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    debugDrawHitbox(ctx, this.getExt(ClientCollidable).getHitBox(), "red");
  }
}
