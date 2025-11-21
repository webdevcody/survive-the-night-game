import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { IClientEntity, Renderable } from "@/entities/util";
import { GameState } from "@/state";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientPositionable } from "@/extensions/positionable";
import { Z_INDEX } from "@shared/map";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { roundVector2 } from "@shared/util/physics";
import { debugDrawHitbox } from "@/util/debug";
import { ClientCollidable } from "@/extensions";
import { getConfig } from "@shared/config";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ThrowingKnifeProjectileClient extends ClientEntityBase implements IClientEntity, Renderable {
  private lastRenderPosition: Vector2;
  private hasInitializedPosition = false;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.lastRenderPosition = PoolManager.getInstance().vector2.claim(0, 0);
  }

  override deserializeFromBuffer(reader: BufferReader): void {
    super.deserializeFromBuffer(reader);
    if (!this.hasInitializedPosition && this.hasExt(ClientPositionable)) {
      this.lastRenderPosition = this.getPosition();
      this.hasInitializedPosition = true;
    }
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
      PoolManager.getInstance().vector2.claim(this.lastRenderPosition.x, this.lastRenderPosition.y),
      gameState.dt
    );

    const renderPosition = roundVector2(this.lastRenderPosition);

    // Draw silver/gray knife (different from brown arrow)
    ctx.beginPath();
    ctx.fillStyle = "#C0C0C0"; // Silver color for knife
    ctx.arc(
      renderPosition.x + getConfig().combat.BULLET_SIZE / 2,
      renderPosition.y + getConfig().combat.BULLET_SIZE / 2,
      getConfig().combat.BULLET_SIZE / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw darker center
    ctx.beginPath();
    ctx.fillStyle = "#808080"; // Darker gray
    ctx.arc(
      renderPosition.x + getConfig().combat.BULLET_SIZE / 2,
      renderPosition.y + getConfig().combat.BULLET_SIZE / 2,
      getConfig().combat.BULLET_SIZE / 4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Only draw hitbox if collidable extension exists
    if (this.hasExt(ClientCollidable)) {
      debugDrawHitbox(ctx, this.getExt(ClientCollidable).getHitBox(), "silver");
    }
  }
}

