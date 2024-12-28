
import {
  GenericEntity,
  Player,
  Positionable,
  PositionableTrait,
  RawEntity,
  distance,
} from "@survive-the-night/game-server";
import { GameState, getEntityById } from "../../state";
import { Renderable } from "../util";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { AssetManager } from "@/managers/asset";

export class FireClient extends GenericEntity implements Renderable {
  private assetManager: AssetManager;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data);
    this.assetManager = assetManager;
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get("Fire");
    const positionable = this.getExt(Positionable);
    const position = positionable.getPosition();
    ctx.drawImage(image, position.x, position.y);
  }
}
