import {
  GenericEntity,
  Player,
  Positionable,
  PositionableTrait,
  RawEntity,
  WeaponType,
  distance,
} from "@survive-the-night/game-server";
import { AssetManager } from "../managers/asset";
import { GameState, getEntityById } from "../state";
import { Renderable } from "./util";
import { animate, bounce } from "../animations";

export class WeaponClient extends GenericEntity implements Renderable {
  private assetManager: AssetManager;
  private weaponType: WeaponType;

  constructor(data: RawEntity, assetManager: AssetManager, weaponType: WeaponType) {
    super(data);
    this.assetManager = assetManager;
    this.weaponType = weaponType;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get(this.weaponType);
    const myPlayer = getEntityById(gameState, gameState.playerId) as PositionableTrait | undefined;
    const positionable = this.getExt(Positionable);
    const centerPosition = positionable.getCenterPosition();
    const position = positionable.getPosition();

    if (myPlayer && distance(myPlayer.getPosition(), position) < Player.MAX_INTERACT_RADIUS) {
      ctx.fillStyle = "white";
      ctx.font = "6px Arial";
      const text = `${this.weaponType} (e)`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, centerPosition.x - textWidth / 2, position.y - 3);
    }

    const animation = bounce(positionable.getSize());
    const animatedPosition = animate(gameState.startedAt, position, animation);
    ctx.drawImage(image, animatedPosition.x, animatedPosition.y);
  }
}
