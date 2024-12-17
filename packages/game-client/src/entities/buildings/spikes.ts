import { GenericEntity, Positionable, RawEntity } from "@survive-the-night/game-server";
import { AssetManager } from "@/managers/asset";
import { GameState } from "../../state";
import { Renderable } from "../util";

export class SpikesClient extends GenericEntity implements Renderable {
  private assetManager: AssetManager;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data);
    this.assetManager = assetManager;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const image = this.assetManager.get("Spikes");
    const positionable = this.getExt(Positionable);
    const centerPosition = positionable.getCenterPosition();
    ctx.drawImage(image, centerPosition.x, centerPosition.y);
  }
}
