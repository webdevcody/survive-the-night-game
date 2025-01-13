import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";
import { GameState } from "../../state";
import { Renderable } from "../util";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { ClientEntity } from "../client-entity";
import { ImageLoader } from "../../managers/asset";
import { ClientPositionable } from "../../extensions";
import { WeaponType } from "@survive-the-night/game-server/src/shared/entities/weapons/weapon";

export class KnifeClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: ImageLoader) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
    const image = this.imageLoader.get("knife");
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    ctx.drawImage(image, position.x, position.y);
  }
}
