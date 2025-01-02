import { Vector2, GenericEntity, RawEntity } from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { GameState } from "../state";
import { IClientEntity, Renderable } from "./util";
import { HITBOX_RADIUS } from "@survive-the-night/game-server/src/shared/entities/bullet";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { Positionable } from "@survive-the-night/game-server/src/shared/extensions";

export class BulletClient extends GenericEntity implements IClientEntity, Renderable {
  private assetManager: AssetManager;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data);
    this.assetManager = assetManager;
    this.extensions = [new Positionable(this)];
  }

  getPosition(): Vector2 {
    return this.getExt(Positionable).getPosition();
  }

  setPosition(position: Vector2): void {
    this.getExt(Positionable).setPosition(position);
  }

  getCenterPosition(): Vector2 {
    return this.getPosition();
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const position = this.getPosition();
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(position.x, position.y, HITBOX_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  public getZIndex(): number {
    return Z_INDEX.PROJECTILES;
  }

  deserialize(data: RawEntity): void {
    super.deserialize(data);
    if (data.position) {
      this.setPosition(data.position);
    }
  }
}
