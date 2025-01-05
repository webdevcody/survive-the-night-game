import { GenericEntity, Positionable, RawEntity, WeaponType } from "@survive-the-night/game-server";
import { AssetManager } from "../../managers/asset";
import { GameState } from "../../state";
import { Renderable } from "../util";
import { animate, bounce } from "../../animations";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { getPlayer } from "../../util/get-player";
import { renderInteractionText } from "../../util/interaction-text";

export class WeaponClient extends GenericEntity implements Renderable {
  private assetManager: AssetManager;
  private weaponType: WeaponType;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data);
    this.assetManager = assetManager;
    this.weaponType = data.weaponType;
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get(this.weaponType);
    const myPlayer = getPlayer(gameState);
    const positionable = this.getExt(Positionable);
    const centerPosition = positionable.getCenterPosition();
    const position = positionable.getPosition();

    if (myPlayer) {
      renderInteractionText(
        ctx,
        `${this.weaponType} (e)`,
        centerPosition,
        position,
        myPlayer.getPosition()
      );
    }

    const animation = bounce(positionable.getSize());
    const animatedPosition = animate(gameState.startedAt, position, animation);
    ctx.drawImage(image, animatedPosition.x, animatedPosition.y);
  }
}
