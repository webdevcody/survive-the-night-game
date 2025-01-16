import {
  Direction,
  isDirectionLeft,
  isDirectionRight,
  isDirectionDown,
  isDirectionUp,
} from "../../../game-shared/src/util/direction";
import { InventoryItem } from "../../../game-shared/src/util/inventory";
import { CropOptions, ImageManager } from "@/managers/image";

const tileSize = 16;

function assetMap({
  flipX = false,
  x,
  y,
  width = tileSize,
  height = tileSize,
  sheet = "default",
}: Partial<CropOptions> & Pick<CropOptions, "x" | "y"> & { sheet?: string }): CropOptions & {
  sheet: string;
} {
  return { flipX, x, y, width, height, sheet };
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
  spikes: assetMap({ x: 357, y: 57 }),
  cloth: assetMap({ x: 51, y: 228 }),
  bullet: assetMap({ x: 68, y: 171 }),
  knife: assetMap({ x: 17, y: 171 }),
  knife_facing_down: assetMap({ x: 51, y: 171 }),
  knife_facing_left: assetMap({ x: 17, y: 171, flipX: true }),
  knife_facing_right: assetMap({ x: 17, y: 171 }),
  knife_facing_up: assetMap({ x: 34, y: 171 }),
  pistol: assetMap({ x: 17, y: 149 }),
  pistol_ammo: assetMap({ x: 64, y: 16, sheet: "items" }),
  pistol_facing_down: assetMap({ x: 51, y: 149 }),
  pistol_facing_left: assetMap({ x: 17, y: 149, flipX: true }),
  pistol_facing_right: assetMap({ x: 17, y: 149 }),
  pistol_facing_up: assetMap({ x: 34, y: 149 }),
  shotgun: assetMap({ x: 17, y: 133 }),
  shotgun_ammo: assetMap({ x: 80, y: 16, sheet: "items" }),
  shotgun_facing_down: assetMap({ x: 51, y: 133 }),
  shotgun_facing_left: assetMap({ x: 17, y: 133, flipX: true }),
  shotgun_facing_right: assetMap({ x: 17, y: 133 }),
  shotgun_facing_up: assetMap({ x: 34, y: 133 }),
  flame: assetMap({ x: 85, y: 266 }),
  flame_0: assetMap({ x: 85, y: 266 }),
  flame_1: assetMap({ x: 102, y: 266 }),
  flame_2: assetMap({ x: 119, y: 266 }),
  flame_3: assetMap({ x: 136, y: 266 }),
  flame_4: assetMap({ x: 153, y: 266 }),
  torch: assetMap({ x: 68, y: 266 }),
  fire: assetMap({ x: 51, y: 265 }),
  gasoline: assetMap({ x: 255, y: 38 }),
  player: assetMap({ x: 493, y: 209 }),
  player_facing_down: assetMap(playerDownFrameOrigins[0]),
  player_facing_down_0: assetMap(playerDownFrameOrigins[0]),
  player_facing_down_1: assetMap(playerDownFrameOrigins[1]),
  player_facing_down_2: assetMap(playerDownFrameOrigins[2]),
  player_facing_left: loadFlipXAsset(playerLeftFrameOrigins[0]),
  player_facing_left_0: loadFlipXAsset(playerLeftFrameOrigins[0]),
  player_facing_left_1: loadFlipXAsset(playerLeftFrameOrigins[1]),
  player_facing_left_2: loadFlipXAsset(playerLeftFrameOrigins[2]),
  player_facing_right: assetMap(playerRightFrameOrigins[0]),
  player_facing_right_0: assetMap(playerRightFrameOrigins[0]),
  player_facing_right_1: assetMap(playerRightFrameOrigins[1]),
  player_facing_right_2: assetMap(playerRightFrameOrigins[2]),
  player_facing_up: assetMap(playerUpFrameOrigins[0]),
  player_facing_up_0: assetMap(playerUpFrameOrigins[0]),
  player_facing_up_1: assetMap(playerUpFrameOrigins[1]),
  player_facing_up_2: assetMap(playerUpFrameOrigins[2]),
  tree: assetMap({ x: 221, y: 209 }),
  wood: assetMap({ x: 221, y: 209 }),
  wall: assetMap({ x: 357, y: 95 }),
  zombie: assetMap({ x: 493, y: 76 }),
  zombie_0: assetMap(zombieDownFrameOrigins[0]),
  zombie_1: assetMap(zombieDownFrameOrigins[1]),
  zombie_2: assetMap(zombieDownFrameOrigins[2]),
  zombie_dead: assetMap({ x: 289, y: 19 }),
  zombie_facing_down: assetMap(zombieDownFrameOrigins[0]),
  zombie_facing_down_0: assetMap(zombieDownFrameOrigins[0]),
  zombie_facing_down_1: assetMap(zombieDownFrameOrigins[1]),
  zombie_facing_down_2: assetMap(zombieDownFrameOrigins[2]),
  zombie_facing_left: assetMap(zombieLeftFrameOrigins[0]),
  zombie_facing_left_0: assetMap(zombieLeftFrameOrigins[0]),
  zombie_facing_left_1: assetMap(zombieLeftFrameOrigins[1]),
  zombie_facing_left_2: assetMap(zombieLeftFrameOrigins[2]),
  zombie_facing_right: loadFlipXAsset(zombieRightFrameOrigins[0]),
  zombie_facing_right_0: loadFlipXAsset(zombieRightFrameOrigins[0]),
  zombie_facing_right_1: loadFlipXAsset(zombieRightFrameOrigins[1]),
  zombie_facing_right_2: loadFlipXAsset(zombieRightFrameOrigins[2]),
  zombie_facing_up: assetMap(zombieUpFrameOrigins[0]),
  zombie_facing_up_0: assetMap(zombieUpFrameOrigins[0]),
  zombie_facing_up_1: assetMap(zombieUpFrameOrigins[1]),
  zombie_facing_up_2: assetMap(zombieUpFrameOrigins[2]),
  bandage: assetMap({ x: 34, y: 190 }),
} as const;

export type Asset = keyof typeof assetsMap;

export const assetsCache = {} as Record<Asset, HTMLImageElement>;

export interface ImageLoader {
  get(assetKey: Asset): HTMLImageElement;
  getWithDirection(assetKey: Asset, direction: Direction | null): HTMLImageElement;
  getFrameIndex(assetKey: Asset, frameIndex: number): HTMLImageElement;
  getFrameWithDirection(
    assetKey: Asset,
    direction: Direction | null,
    frameIndex: number
  ): HTMLImageElement;
}

export class AssetManager implements ImageLoader {
  private imageManager = new ImageManager();
  private sheets: Record<string, HTMLImageElement> = {};
  private loaded = false;

  public async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    // Load all sprite sheets
    this.sheets = {
      default: await this.imageManager.load("/tile-sheet.png"),
      items: await this.imageManager.load("/sheets/items-sheet.png"),
    };

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

  public getFrameIndex(key: Asset, frameIndex: number) {
    const keyWithFrame = `${key}_${frameIndex}`;
    return this.get(keyWithFrame as Asset);
  }

  public getFrameWithDirection(key: Asset, direction: Direction | null, frameIndex: number) {
    const keyWithDirection = this.addDirectionSuffix(key, direction);
    const keyWithFrame = `${keyWithDirection}_${frameIndex}`;
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
        suffix = "_facing_left";
      } else if (isDirectionRight(direction)) {
        suffix = "_facing_right";
      } else if (isDirectionDown(direction)) {
        suffix = "_facing_down";
      } else if (isDirectionUp(direction)) {
        suffix = "_facing_up";
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

  private async populateCache(): Promise<void> {
    await Promise.all(
      Object.keys(assetsMap).map(async (assetKey) => {
        const asset = assetKey as Asset;
        const cropOptions = assetsMap[asset];
        const sheet = this.sheets[cropOptions.sheet || "default"];
        if (!sheet) {
          throw new Error(`Sheet not found: ${cropOptions.sheet}`);
        }
        assetsCache[asset] = await this.imageManager.crop(sheet, cropOptions);
      })
    );
  }
}

export function getItemAssetKey(item: InventoryItem): Asset {
  return item.key as Asset;
}
