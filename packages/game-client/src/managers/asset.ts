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
  PlayerFacingLeft: assetMap({ x: 493, y: 209, flipX: true }),
  PlayerFacingRight: assetMap({ x: 493, y: 209 }),
  PlayerFacingUp: assetMap({ x: 493, y: 171 }),
} as const;

export type Asset = keyof typeof assetsMap;

export const assetsCache = {} as Record<Asset, HTMLImageElement>;

export class AssetManager {
  private imageManager = new ImageManager();
  private sheet: HTMLImageElement | null = null;

  public async init(): Promise<void> {
    if (this.sheet === null) {
      this.sheet = await this.imageManager.load("/tile-sheet.png");
    }

    await this.populateCache();
  }

  public get(assetKey: Asset): HTMLImageElement {
    return assetsCache[assetKey];
  }

  public getSheet(): HTMLImageElement {
    if (this.sheet === null) {
      throw new Error(
        "Tried getting a sheet without having it initialized, make sure to call `.init()` first"
      );
    }

    return this.sheet;
  }

  private async populateCache(): Promise<void> {
    const sheet = this.getSheet();

    await Promise.all(
      Object.keys(assetsMap).map(async (assetKey) => {
        const cropOptions = assetsMap[assetKey as Asset];
        await this.imageManager.crop(sheet, cropOptions);
      })
    );
  }
}
