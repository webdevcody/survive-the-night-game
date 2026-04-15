import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { Z_INDEX } from "@shared/map";
import { MERCHANT_STATION_COLLIDABLE_IDS } from "@shared/map/merchant-station-collidables";
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

function findConnectedMerchantStationBounds(
  collidables: number[][],
  originTileX: number,
  originTileY: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const H = collidables.length;
  const W = collidables[0]?.length ?? 0;
  if (W === 0 || H === 0) return null;

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;

  const seeds: Array<[number, number]> = [];
  const consider = (x: number, y: number) => {
    if (inBounds(x, y) && MERCHANT_STATION_COLLIDABLE_IDS.has(collidables[y][x])) {
      seeds.push([x, y]);
    }
  };
  consider(originTileX, originTileY);
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      consider(originTileX + dx, originTileY + dy);
    }
  }
  if (seeds.length === 0) return null;

  const visited = new Set<string>();
  const q: Array<[number, number]> = [[seeds[0][0], seeds[0][1]]];
  visited.add(`${seeds[0][0]},${seeds[0][1]}`);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  while (q.length > 0) {
    const [x, y] = q.pop()!;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (!inBounds(nx, ny) || visited.has(key)) continue;
      if (!MERCHANT_STATION_COLLIDABLE_IDS.has(collidables[ny][nx])) continue;
      visited.add(key);
      q.push([nx, ny]);
    }
    if (visited.size > 32) break;
  }

  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
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
    if (collidables?.length) {
      const bounds = findConnectedMerchantStationBounds(collidables, tileX, tileY);
      if (bounds != null) {
        return;
      }
    }

    const sw = MERCHANT_SHEET_COLS * TILE_SIZE;
    const sh = MERCHANT_SHEET_ROWS * TILE_SIZE;

    ctx.drawImage(sheet, MERCHANT_SHEET_X, MERCHANT_SHEET_Y, sw, sh, position.x, position.y, sw, sh);
  }
}
