import {
  distance,
  Entities,
  EntityType,
  MAX_HARVEST_RADIUS,
  Positionable,
  Vector2,
  WeaponType,
} from "@survive-the-night/game-server";
import { AssetManager } from "../managers/asset";
import { getEntityById, GameState } from "../state";
import { Animatable, animate, Animation, IClientEntity, Renderable } from "./util";

const WEAPON_SIZE = 16;

export class WeaponClient implements Renderable, Animatable, Positionable, IClientEntity {
  private assetManager: AssetManager;
  private type: EntityType;
  private weaponType: WeaponType;
  private id: string;
  private position: Vector2 = { x: 0, y: 0 };

  public constructor(id: string, assetManager: AssetManager, weaponType: WeaponType) {
    this.id = id;
    this.type = Entities.WEAPON;
    this.assetManager = assetManager;
    this.weaponType = weaponType;
  }

  public getAnimation(): Animation {
    return {
      duration: 700,
      frames: {
        0: {
          x: 0,
          y: 0,
        },
        20: {
          x: 0,
          y: WEAPON_SIZE * 0.1,
        },
        40: {
          x: 0,
          y: 0,
        },
      },
    };
  }

  public getId(): string {
    return this.id;
  }

  public getType(): EntityType {
    return this.type;
  }

  public setType(type: EntityType): void {
    this.type = type;
  }

  public setId(id: string): void {
    this.id = id;
  }

  public getPosition(): Vector2 {
    return this.position;
  }

  public setPosition(position: Vector2): void {
    this.position = position;
  }

  public getCenterPosition(): Vector2 {
    return {
      x: this.position.x + WEAPON_SIZE / 2,
      y: this.position.y + WEAPON_SIZE / 2,
    };
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get(this.weaponType);
    const myPlayer = getEntityById(gameState, gameState.playerId) as Positionable | undefined;

    if (myPlayer && distance(myPlayer.getPosition(), this.getPosition()) < MAX_HARVEST_RADIUS) {
      ctx.fillStyle = "white";
      ctx.font = "6px Arial";
      const text = "pick up (e)";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, this.getCenterPosition().x - textWidth / 2, this.getPosition().y - 3);
    }

    const position = animate(gameState.startedAt, this.getPosition(), this.getAnimation());
    ctx.drawImage(image, position.x, position.y);
  }
}
