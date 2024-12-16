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

function getFrameOrigin({
  startX,
  startY,
  frameIndex,
}: {
  startX: number;
  startY: number;
  frameIndex: number;
}) {
  return {
    x: startX + (tileSize + 1) * frameIndex,
    y: startY,
  };
}

function getFrameOrigins({ startX, startY, totalFrames }: FrameInfo): FrameOrigin[] {
  return Array.from({ length: totalFrames }, (_, index) =>
    getFrameOrigin({ startX, startY, frameIndex: index })
  );
}

function loadFlipXAsset(frameOrigin: FrameOrigin) {
  return assetMap({ ...frameOrigin, flipX: true });
}

type FrameInfo = {
  startX: number;
  startY: number;
  totalFrames: number;
};

type FrameOrigin = {
  x: number;
  y: number;
};

const playerDownFrameOrigins = getFrameOrigins({ startX: 493, startY: 190, totalFrames: 3 });
const playerLeftFrameOrigins = getFrameOrigins({ startX: 493, startY: 209, totalFrames: 3 });
const playerUpFrameOrigins = getFrameOrigins({ startX: 493, startY: 171, totalFrames: 3 });
const playerRightFrameOrigins = getFrameOrigins({ startX: 493, startY: 209, totalFrames: 3 });

const zombieUpFrameOrigins = getFrameOrigins({ startX: 496, startY: 57, totalFrames: 3 });
const zombieDownFrameOrigins = getFrameOrigins({ startX: 496, startY: 76, totalFrames: 3 });
const zombieLeftFrameOrigins = getFrameOrigins({ startX: 496, startY: 95, totalFrames: 3 });
const zombieRightFrameOrigins = getFrameOrigins({ startX: 496, startY: 95, totalFrames: 3 });

// sheet gaps: 1px horizontally, 3px vertically
export const assetsMap = {
  Cloth: assetMap({ x: 51, y: 228 }),
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
  PlayerFacingDown: assetMap(playerDownFrameOrigins[0]),
  PlayerFacingDown0: assetMap(playerDownFrameOrigins[0]),
  PlayerFacingDown1: assetMap(playerDownFrameOrigins[1]),
  PlayerFacingDown2: assetMap(playerDownFrameOrigins[2]),
  PlayerFacingLeft: loadFlipXAsset(playerLeftFrameOrigins[0]),
  PlayerFacingLeft0: loadFlipXAsset(playerLeftFrameOrigins[0]),
  PlayerFacingLeft1: loadFlipXAsset(playerLeftFrameOrigins[1]),
  PlayerFacingLeft2: loadFlipXAsset(playerLeftFrameOrigins[2]),
  PlayerFacingRight: assetMap(playerRightFrameOrigins[0]),
  PlayerFacingRight0: assetMap(playerRightFrameOrigins[0]),
  PlayerFacingRight1: assetMap(playerRightFrameOrigins[1]),
  PlayerFacingRight2: assetMap(playerRightFrameOrigins[2]),
  PlayerFacingUp: assetMap(playerUpFrameOrigins[0]),
  PlayerFacingUp0: assetMap(playerUpFrameOrigins[0]),
  PlayerFacingUp1: assetMap(playerUpFrameOrigins[1]),
  PlayerFacingUp2: assetMap(playerUpFrameOrigins[2]),
  Tree: assetMap({ x: 221, y: 209 }),
  Wall: assetMap({ x: 357, y: 95 }),
  Zombie: assetMap({ x: 493, y: 76 }),
  ZombieDead: assetMap({ x: 289, y: 19 }),
  ZombieFacingDown: assetMap(zombieDownFrameOrigins[0]),
  ZombieFacingDown0: assetMap(zombieDownFrameOrigins[0]),
  ZombieFacingDown1: assetMap(zombieDownFrameOrigins[1]),
  ZombieFacingDown2: assetMap(zombieDownFrameOrigins[2]),
  ZombieFacingLeft: assetMap(zombieLeftFrameOrigins[0]),
  ZombieFacingLeft0: assetMap(zombieLeftFrameOrigins[0]),
  ZombieFacingLeft1: assetMap(zombieLeftFrameOrigins[1]),
  ZombieFacingLeft2: assetMap(zombieLeftFrameOrigins[2]),
  ZombieFacingRight: loadFlipXAsset(zombieRightFrameOrigins[0]),
  ZombieFacingRight0: loadFlipXAsset(zombieRightFrameOrigins[0]),
  ZombieFacingRight1: loadFlipXAsset(zombieRightFrameOrigins[1]),
  ZombieFacingRight2: loadFlipXAsset(zombieRightFrameOrigins[2]),
  ZombieFacingUp: assetMap(zombieUpFrameOrigins[0]),
  ZombieFacingUp0: assetMap(zombieUpFrameOrigins[0]),
  ZombieFacingUp1: assetMap(zombieUpFrameOrigins[1]),
  ZombieFacingUp2: assetMap(zombieUpFrameOrigins[2]),
  Bandage: assetMap({ x: 34, y: 190 }),
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

  public getFrameWithDirection(key: Asset, direction: Direction | null, frameIndex: number) {
    const keyWithDirection = this.addDirectionSuffix(key, direction);
    const keyWithFrame = `${keyWithDirection}${frameIndex}`;
    return this.get(keyWithFrame as Asset);
  }

  /**
   * Adds a direction suffix to asset key such as "Player" -> "PlayerFacingLeft"
   * @param key - The asset key
   * @param direction - The direction
   * @returns The asset key with the direction suffix
   */
  addDirectionSuffix(key: Asset, direction: Direction | null) {
    let suffix = "";

    if (direction !== null) {
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
    return keyWithDirection;
  }

  public getWithDirection(key: Asset, direction: Direction | null): HTMLImageElement {
    const keyWithDirection = this.addDirectionSuffix(key, direction);

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
  } else if (item.key === "Wall") {
    return "Wall";
  } else if (item.key === "Bandage") {
    return "Bandage";
  } else if (item.key === "Cloth") {
    return "Cloth";
  }

  throw new Error(`Unknown item type '${item.key}'`);
}
