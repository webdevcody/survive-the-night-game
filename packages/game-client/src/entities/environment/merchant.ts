import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { Z_INDEX } from "@shared/map";
import { MERCHANT_STATION_COLLIDABLE_IDS } from "@shared/map/merchant-station-collidables";
import {
  MERCHANT_FOOTPRINT_TILES_H,
  MERCHANT_FOOTPRINT_TILES_W,
} from "@shared/map/merchant-footprint";
import { type MerchantShopItem } from "@shared/config";
import { getConfig } from "@shared/config";
import { ClientPositionable } from "@/extensions";
import { tryGetWorldCollidables } from "@/util/world-collidables-access";

/** Merchant stall on `collidables.png`: 3×2 tiles starting at pixel (16, 320). */
const MERCHANT_SHEET_X = 16;
const MERCHANT_SHEET_Y = 320;
const MERCHANT_SHEET_COLS = 3;
const MERCHANT_SHEET_ROWS = 2;

/** Server/client `Positionable` top-left matches the stall sprite top-left (3×2 tiles). */

/** True when the collidable layer already paints the full 3×2 stall under this entity (procedural / aligned authored stations). */
function isMerchantFootprintFullyStationCollidable(
  collidables: number[][],
  originTileX: number,
  originTileY: number,
): boolean {
  const H = collidables.length;
  const W = collidables[0]?.length ?? 0;
  if (W === 0 || H === 0) return false;

  for (let dy = 0; dy < MERCHANT_FOOTPRINT_TILES_H; dy++) {
    for (let dx = 0; dx < MERCHANT_FOOTPRINT_TILES_W; dx++) {
      const x = originTileX + dx;
      const y = originTileY + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      if (!MERCHANT_STATION_COLLIDABLE_IDS.has(collidables[y][x])) return false;
    }
  }
  return true;
}

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
    const position = this.getExt(ClientPositionable).getPosition();
    const tileX = Math.floor(position.x / TILE_SIZE);
    const tileY = Math.floor(position.y / TILE_SIZE);

    const collidables = tryGetWorldCollidables();
    if (
      collidables?.length &&
      isMerchantFootprintFullyStationCollidable(collidables, tileX, tileY)
    ) {
      return;
    }

    const sw = MERCHANT_SHEET_COLS * TILE_SIZE;
    const sh = MERCHANT_SHEET_ROWS * TILE_SIZE;

    ctx.drawImage(sheet, MERCHANT_SHEET_X, MERCHANT_SHEET_Y, sw, sh, position.x, position.y, sw, sh);
  }
}
