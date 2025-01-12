import { Positionable } from "@survive-the-night/game-server";
import { RawEntity } from "@survive-the-night/game-shared";
import { AssetManager } from "@/managers/asset";
import { GameState } from "../../state";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { ClientEntity } from "../../entities/client-entity";
import { Renderable } from "../util";

export class ClothClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const image = this.assetManager.get("cloth");
    const position = this.getExt(Positionable).getPosition();
    ctx.drawImage(image, position.x, position.y);
  }
}
