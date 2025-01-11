import { ClientPositionable } from "../../extensions";
import { RawEntity } from "@survive-the-night/game-shared";
import { AssetManager } from "@/managers/asset";
import { GameState } from "../../state";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { ClientEntityBase } from "../../extensions/client-entity";
import { Renderable } from "../util";

export class ClothClient extends ClientEntityBase implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.assetManager = assetManager;
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    // super.render(ctx, gameState);

    const image = this.assetManager.get("cloth");
    const position = this.getExt(ClientPositionable).getPosition();
    ctx.drawImage(image, position.x, position.y);
  }
}
