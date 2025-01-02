import {
  GenericEntity,
  Player,
  Positionable,
  RawEntity,
  Triggerable,
  TriggerCooldownAttacker,
  distance,
} from "@survive-the-night/game-server";
import { AssetManager } from "../../managers/asset";
import { GameState } from "../../state";
import { Renderable } from "../util";
import { debugDrawHitbox } from "../../util/debug";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { getPlayer } from "../../util/get-player";

export class SpikesClient extends GenericEntity implements Renderable {
  private assetManager: AssetManager;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data);
    this.assetManager = assetManager;
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get("spikes");
    const positionable = this.getExt(Positionable);
    const centerPosition = positionable.getCenterPosition();
    const position = positionable.getPosition();
    const extension = this.getExt(TriggerCooldownAttacker);
    const myPlayer = getPlayer(gameState);

    if (myPlayer && distance(myPlayer.getPosition(), position) < Player.MAX_INTERACT_RADIUS) {
      ctx.fillStyle = "white";
      ctx.font = "6px Arial";
      const text = "collect (e)";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, centerPosition.x - textWidth / 2, position.y - 3);
    }

    if (extension.isReady) {
      ctx.drawImage(image, position.x, position.y);
    } else {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(image, position.x, position.y);
      ctx.globalAlpha = 1;
    }

    debugDrawHitbox(ctx, this.getExt(Triggerable).getTriggerBox(), "red");
  }
}
