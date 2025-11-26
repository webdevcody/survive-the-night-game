import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { Z_INDEX } from "@shared/map";
import { type MerchantShopItem } from "@shared/config";

export class MerchantClient extends ClientEntity implements Renderable {
  public shopItems: MerchantShopItem[] = [];

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getShopItems(): MerchantShopItem[] {
    return this.shopItems;
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
  }
}
