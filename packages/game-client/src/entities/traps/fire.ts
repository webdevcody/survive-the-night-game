import { GenericEntity, Positionable, RawEntity } from "@survive-the-night/game-server";
import { GameState } from "../../state";
import { getFrameIndex, Renderable } from "../util";
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
    const frameIndex = getFrameIndex(gameState.startedAt, {
      duration: 700,
      frames: 5,
    });

    const image = this.assetManager.getFrameIndex("Flame", frameIndex);

    const positionable = this.getExt(Positionable);
    const position = positionable.getPosition();
    ctx.drawImage(image, position.x, position.y);
  }
}
