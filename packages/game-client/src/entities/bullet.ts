import { Vector2 } from "@survive-the-night/game-server";
import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";
import { AssetManager } from "../managers/asset";
import { IClientEntity, Renderable } from "./util";
import { GameState } from "../state";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { ClientEntityBase } from "../extensions/client-entity";
import { ClientPositionable } from "../extensions/positionable";

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
    ctx.fillStyle = "yellow";
    ctx.fillRect(position.x, position.y, this.BULLET_SIZE, this.BULLET_SIZE);
  }
}
