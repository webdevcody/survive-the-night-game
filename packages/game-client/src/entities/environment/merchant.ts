import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { MerchantShopItem } from "@shared/config/game-config";

export class MerchantClient extends ClientEntity implements Renderable {
  private shopItems: MerchantShopItem[] = [];

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);

    // Store shop items from the server
    if (data.shopItems) {
      this.shopItems = data.shopItems;
    }
  }

  public deserialize(data: RawEntity): void {
    super.deserialize(data);

    // Update shop items when received from server
    if (data.shopItems) {
      this.shopItems = data.shopItems;
    }
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
