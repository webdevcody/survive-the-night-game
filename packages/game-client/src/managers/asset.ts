import {
  Direction,
  InventoryItem,
  isDirectionDown,
  isDirectionLeft,
  isDirectionRight,
  isDirectionUp,
} from "@survive-the-night/game-server";
import { CropOptions, ImageManager } from "./image";

const tileSize = 16;

function assetMap({
  flipX = false,
  x,
  y,
  width = tileSize,
  height = tileSize,
}: Partial<CropOptions> & Pick<CropOptions, "x" | "y">): CropOptions {
  return { flipX, x, y, width, height };
}

// sheet gaps: 1px horizontally, 3px vertically
export const assetsMap = {
  Knife: assetMap({ x: 17, y: 171 }),
  KnifeFacingDown: assetMap({ x: 51, y: 171 }),
  KnifeFacingLeft: assetMap({ x: 17, y: 171, flipX: true }),
  KnifeFacingRight: assetMap({ x: 17, y: 171 }),
  KnifeFacingUp: assetMap({ x: 34, y: 171 }),
  Pistol: assetMap({ x: 17, y: 149 }),
  PistolFacingDown: assetMap({ x: 51, y: 149 }),
  PistolFacingLeft: assetMap({ x: 17, y: 149, flipX: true }),
  PistolFacingRight: assetMap({ x: 17, y: 149 }),
  PistolFacingUp: assetMap({ x: 34, y: 149 }),
  Shotgun: assetMap({ x: 17, y: 133 }),
  ShotgunFacingDown: assetMap({ x: 51, y: 133 }),
  ShotgunFacingLeft: assetMap({ x: 17, y: 133, flipX: true }),
  ShotgunFacingRight: assetMap({ x: 17, y: 133 }),
  ShotgunFacingUp: assetMap({ x: 34, y: 133 }),
  Player: assetMap({ x: 493, y: 209 }),
  PlayerFacingDown: assetMap({ x: 493, y: 190 }),
  PlayerFacingLeft: assetMap({ x: 493, y: 209, flipX: true }),
  PlayerFacingRight: assetMap({ x: 493, y: 209 }),
  PlayerFacingUp: assetMap({ x: 493, y: 171 }),
  Tree: assetMap({ x: 221, y: 209 }),
  Wall: assetMap({ x: 357, y: 95 }),
  Zombie: assetMap({ x: 493, y: 76 }),
  ZombieFacingDown: assetMap({ x: 493, y: 76 }),
  ZombieFacingLeft: assetMap({ x: 493, y: 95 }),
  ZombieFacingRight: assetMap({ x: 493, y: 95, flipX: true }),
  ZombieFacingUp: assetMap({ x: 493, y: 57 }),
} as const;

export type Asset = keyof typeof assetsMap;

export const assetsCache = {} as Record<Asset, HTMLImageElement>;

export class AssetManager {
  private imageManager = new ImageManager();
  private sheet: HTMLImageElement | null = null;
  private loaded = false;

  public async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    if (this.sheet === null) {
      this.sheet = await this.imageManager.load("/tile-sheet.png");
    }

    await this.populateCache();
    this.loaded = true;
  }

  public get(assetKey: Asset): HTMLImageElement {
    if (!this.loaded) {
      throw new Error(
        "Tried getting an asset without having it loaded, make sure to call `.load()` first"
      );
    }
    const asset = assetsCache[assetKey];
    return asset;
  }

  public getWithDirection(key: Asset, direction: Direction | null): HTMLImageElement {
    let suffix = "";

    if (direction) {
      if (isDirectionLeft(direction)) {
        suffix = "FacingLeft";
      } else if (isDirectionRight(direction)) {
        suffix = "FacingRight";
      } else if (isDirectionDown(direction)) {
        suffix = "FacingDown";
      } else if (isDirectionUp(direction)) {
        suffix = "FacingUp";
      }
    }

    const keyWithDirection = `${key}${suffix}` as Asset;

    let asset = this.get(keyWithDirection);
    if (asset === undefined) {
      asset = this.get(key);
    }

    if (asset === undefined) {
      throw new Error(
        `Tried getting an asset with direction that is not registered '${keyWithDirection}'`
      );
    }

    return asset;
  }

  public getSheet(): HTMLImageElement {
    if (this.sheet === null) {
      throw new Error(
        "Tried getting a sheet without having it initialized, make sure to call `.load()` first"
      );
    }

    return this.sheet;
  }

  private async populateCache(): Promise<void> {
    const sheet = this.getSheet();

    await Promise.all(
      Object.keys(assetsMap).map(async (assetKey) => {
        const asset = assetKey as Asset;
        const cropOptions = assetsMap[asset];
        assetsCache[asset] = await this.imageManager.crop(sheet, cropOptions);
      })
    );
  }
}

export function getItemAssetKey(item: InventoryItem): Asset {
  if (item.key === "Knife") {
    return "Knife";
  } else if (item.key === "Shotgun") {
    return "Shotgun";
  } else if (item.key === "Pistol") {
    return "Pistol";
  } else if (item.key === "Wood") {
    return "Tree";
  }

  throw new Error(`Unknown item type '${item.key}'`);
}
