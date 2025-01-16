import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "../managers/asset";
import { IClientEntity, Renderable } from "./util";
import { GameState } from "../state";
import { ClientEntityBase } from "../extensions/client-entity";
import { ClientPositionable } from "../extensions/positionable";
import { Vector2 } from "@shared/geom/physics";
import { Z_INDEX } from "@shared/map";

export class BulletClient extends ClientEntityBase implements IClientEntity, Renderable {
  private readonly BULLET_SIZE = 4;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
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
    const position = this.getPosition();
    // Draw yellow outer bullet
    ctx.beginPath();
    ctx.fillStyle = "yellow";
    ctx.arc(
      position.x + this.BULLET_SIZE / 2,
      position.y + this.BULLET_SIZE / 2,
      this.BULLET_SIZE / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw red center
    ctx.beginPath();
    ctx.fillStyle = "red";
    ctx.arc(
      position.x + this.BULLET_SIZE / 2,
      position.y + this.BULLET_SIZE / 2,
      this.BULLET_SIZE / 4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}
