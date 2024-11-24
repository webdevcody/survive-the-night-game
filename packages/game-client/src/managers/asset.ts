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
  PlayerFacingCenter: assetMap({ x: 493, y: 190 }),
  PlayerFacingDown: assetMap({ x: 493, y: 190 }),
  PlayerFacingLeft: assetMap({ x: 493, y: 209, flipX: true }),
  PlayerFacingRight: assetMap({ x: 493, y: 209 }),
  PlayerFacingUp: assetMap({ x: 493, y: 171 }),
  Tree: assetMap({ x: 221, y: 209 }),
  Wall: assetMap({ x: 357, y: 95 }),
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
    const asset = assetsCache[assetKey];
    if (asset === undefined) {
      throw new Error(
        "Tried getting an asset without having it cached, make sure to call `.load()` first"
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
