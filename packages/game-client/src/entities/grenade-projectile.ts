import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { IClientEntity, Renderable } from "@/entities/util";
import { GameState } from "@/state";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientPositionable } from "@/extensions/positionable";
import { Z_INDEX } from "@shared/map";
import Vector2 from "@shared/util/vector2";
import { roundVector2 } from "@shared/util/physics";
import { BufferReader } from "@shared/util/buffer-serialization";

export class GrenadeProjectileClient extends ClientEntityBase implements IClientEntity, Renderable {
  private lastRenderPosition: Vector2;
  private hasInitializedPosition = false;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.lastRenderPosition = new Vector2(0, 0);
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
      new Vector2(this.lastRenderPosition.x, this.lastRenderPosition.y)
    );

    const renderPosition = roundVector2(this.lastRenderPosition);
    const image = this.imageLoader.get("grenade");
    ctx.drawImage(image, renderPosition.x, renderPosition.y);
  }
}

