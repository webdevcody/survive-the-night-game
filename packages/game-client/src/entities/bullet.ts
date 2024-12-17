import { Entities, EntityType, PositionableTrait, Vector2 } from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { GameState } from "../state";
import { IClientEntity, Renderable } from "./util";
import { HITBOX_RADIUS } from "@survive-the-night/game-server/src/shared/entities/bullet";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";

export class BulletClient implements IClientEntity, Renderable, PositionableTrait {
  private assetManager: AssetManager;
  private position: Vector2 = { x: 0, y: 0 };
  private type: EntityType;
  private id: string;

  constructor(id: string, assetManager: AssetManager) {
    this.id = id;
    this.type = Entities.BULLET;
    this.assetManager = assetManager;
  }

  getId(): string {
    return this.id;
  }

  getType(): EntityType {
    return this.type;
  }

  setType(type: EntityType): void {
    this.type = type;
  }

  setId(id: string): void {
    this.id = id;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, HITBOX_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  public getZIndex(): number {
    return Z_INDEX.PROJECTILES;
  }
}
