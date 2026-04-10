import { ClientEntityBase } from "@/extensions/client-entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { RawEntity } from "@shared/types/entity";
import { Z_INDEX } from "@shared/map";
import { Renderable } from "@/entities/util";

/** Invisible map light; illumination comes from serialized Illuminated extension. */
export class LightDecalClient extends ClientEntityBase implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.DECALS;
  }

  public render(_ctx: CanvasRenderingContext2D, _gameState: GameState): void {
    // No sprite
  }
}
