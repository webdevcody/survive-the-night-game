import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { COLLIDABLE_TILE_MERCHANT, Z_INDEX } from "@shared/map";
import { type MerchantShopItem } from "@shared/config";
import { getConfig } from "@shared/config";
import { ClientPositionable } from "@/extensions";

export class MerchantClient extends ClientEntity implements Renderable {
  public shopItems: MerchantShopItem[] = [];

  private static collidablesSheet: HTMLImageElement | null = null;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);

    if (!MerchantClient.collidablesSheet) {
      MerchantClient.collidablesSheet = new Image();
      MerchantClient.collidablesSheet.src = "/sheets/collidables.png";
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

    const sheet = MerchantClient.collidablesSheet;
    if (!sheet?.complete || !this.hasExt(ClientPositionable)) {
      return;
    }

    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const cols = Math.max(1, Math.floor(sheet.naturalWidth / TILE_SIZE));
    const tileId = COLLIDABLE_TILE_MERCHANT;
    const cc = tileId % cols;
    const cr = Math.floor(tileId / cols);
    const position = this.getExt(ClientPositionable).getPosition();

    ctx.drawImage(
      sheet,
      cc * TILE_SIZE,
      cr * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE,
      position.x,
      position.y,
      TILE_SIZE,
      TILE_SIZE,
    );
  }
}
