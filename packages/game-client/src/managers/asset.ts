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
  rotation = 0,
}: Partial<CropOptions> & Pick<CropOptions, "x" | "y"> & { sheet?: string }): CropOptions & {
  sheet: string;
} {
  return { flipX, x, y, width, height, sheet, rotation };
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
    x: startX + tileSize * frameIndex,
    y: startY,
  };
}

function getFrameOrigins({ startX, startY, totalFrames, sheet }: FrameInfo): FrameOrigin[] {
  return Array.from({ length: totalFrames }, (_, index) => ({
    ...getFrameOrigin({ startX, startY, frameIndex: index }),
    sheet,
  }));
}

function createCharacterFrames({
  startX,
  downY,
  leftY,
  upY,
  totalFrames,
  sheet = "characters",
}: {
  startX: number;
  downY: number;
  leftY: number;
  upY: number;
  totalFrames: number;
  sheet?: string;
}) {
  return {
    down: getFrameOrigins({ startX, startY: downY, totalFrames, sheet }),
    left: getFrameOrigins({ startX, startY: leftY, totalFrames, sheet }),
    up: getFrameOrigins({ startX, startY: upY, totalFrames, sheet }),
    right: getFrameOrigins({ startX, startY: leftY, totalFrames, sheet }), // Reuse left frames and flip
  };
}

function createSpriteFrames(options: {
  key: string;
  x: number;
  y: number;
  totalFrames: number;
  sheet?: string;
}) {
  return Array.from({ length: options.totalFrames }, (_, index) => ({
    [options.key]: assetMap({ x: options.x + index * 16, y: options.y, sheet: options.sheet }),
    [`${options.key}_${index}`]: assetMap({
      x: options.x + index * 16,
      y: options.y,
      sheet: options.sheet,
    }),
  })).reduce((acc, curr) => ({ ...acc, ...curr }), {});
}

function createCharacterAssets(
  name: string,
  frames: ReturnType<typeof createCharacterFrames>,
  deadX?: number,
  deadY?: number
) {
  const assets: Record<string, CropOptions & { sheet: string }> = {
    [`${name}`]: assetMap(frames.down[0]),
    ...frames.down.reduce(
      (acc, frame, index) => ({
        ...acc,
        [`${name}_${index}`]: assetMap(frame),
      }),
      {}
    ),
  };

  if (deadX !== undefined && deadY !== undefined) {
    assets[`${name}_dead`] = assetMap({ x: deadX, y: deadY, sheet: "characters" });
  }

  // Add directional frames
  const directions = ["down", "right", "up"] as const;
  directions.forEach((direction) => {
    frames[direction].forEach((frame, index) => {
      assets[`${name}_facing_${direction}_${index}`] = assetMap(frame);
    });
  });

  // Add right frames (flipped)
  frames.right.forEach((frame, index) => {
    assets[`${name}_facing_left_${index}`] = loadFlipXAsset(frame);
  });

  return assets;
}

function loadFlipXAsset(frameOrigin: FrameOrigin) {
  return assetMap({ ...frameOrigin, flipX: true });
}

type FrameInfo = {
  startX: number;
  startY: number;
  totalFrames: number;
  sheet?: string;
};

type FrameOrigin = {
  x: number;
  y: number;
};

const zombieUpFrameOrigins = getFrameOrigins({ startX: 496, startY: 57, totalFrames: 3 });
const zombieDownFrameOrigins = getFrameOrigins({ startX: 496, startY: 76, totalFrames: 3 });
const zombieLeftFrameOrigins = getFrameOrigins({ startX: 496, startY: 95, totalFrames: 3 });
const zombieRightFrameOrigins = getFrameOrigins({ startX: 496, startY: 95, totalFrames: 3 });

const swingDownFrameOrigins = getFrameOrigins({
  startX: 0,
  startY: 96,
  totalFrames: 4,
  sheet: "items",
});

const bigZombieDownFrameOrigins = getFrameOrigins({
  startX: 0,
  startY: 64,
  totalFrames: 3,
  sheet: "characters",
});

const zombieSwingDownFrameOrigins = getFrameOrigins({
  startX: 0,
  startY: 112,
  totalFrames: 4,
  sheet: "items",
});

const zombieFastFrames = createCharacterFrames({
  startX: 0,
  downY: 208,
  leftY: 224,
  upY: 192,
  totalFrames: 3,
});

const playerFrames = createCharacterFrames({
  startX: 0,
  downY: 112,
  leftY: 128,
  upY: 96,
  totalFrames: 3,
});

const playerWdcFrames = createCharacterFrames({
  startX: 64,
  downY: 112,
  leftY: 128,
  upY: 96,
  totalFrames: 3,
});

const batFrames = createCharacterFrames({
  startX: 0,
  downY: 240,
  leftY: 240,
  upY: 240,
  totalFrames: 3,
});

const ROTATION_MAP: Record<Direction, number> = {
  [Direction.Up]: 180,
  [Direction.Down]: 0,
  [Direction.Left]: 90,
  [Direction.Right]: 270,
  [Direction.UpLeft]: 135,
  [Direction.UpRight]: 225,
  [Direction.DownLeft]: 45,
  [Direction.DownRight]: 315,
};

function createDirectionalFrames(baseFrames: FrameOrigin[], prefix: string) {
  const frames: Record<string, CropOptions & { sheet: string }> = {};

  // Add base frame
  frames[prefix] = assetMap(baseFrames[0]);

  // Add directional frames for main directions only
  [Direction.Up, Direction.Down, Direction.Left, Direction.Right].forEach((direction) => {
    const dirName = Direction[direction].toLowerCase();
    baseFrames.forEach((frame, index) => {
      const key = `${prefix}_facing_${dirName}_${index}`;
      frames[key] = assetMap({ ...frame, rotation: ROTATION_MAP[direction] });
    });
  });

  return frames;
}

export const assetsMap = {
  spikes: assetMap({ x: 357, y: 57 }),
  landmine: assetMap({ x: 16, y: 48, sheet: "items" }),
  fire_extinguisher: assetMap({ x: 112, y: 0, sheet: "items" }),
  grenade: assetMap({ x: 64, y: 0, sheet: "items" }),
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
  big_zombie: assetMap(bigZombieDownFrameOrigins[0]),
  big_zombie_0: assetMap(bigZombieDownFrameOrigins[0]),
  big_zombie_1: assetMap(bigZombieDownFrameOrigins[1]),
  big_zombie_2: assetMap(bigZombieDownFrameOrigins[2]),
  big_zombie_facing_down_0: assetMap(bigZombieDownFrameOrigins[0]),
  big_zombie_facing_down_1: assetMap(bigZombieDownFrameOrigins[1]),
  big_zombie_facing_down_2: assetMap(bigZombieDownFrameOrigins[2]),
  big_zombie_facing_left_0: assetMap(bigZombieDownFrameOrigins[0]),
  big_zombie_facing_left_1: assetMap(bigZombieDownFrameOrigins[1]),
  big_zombie_facing_left_2: assetMap(bigZombieDownFrameOrigins[2]),
  big_zombie_facing_right_0: assetMap(bigZombieDownFrameOrigins[0]),
  big_zombie_facing_right_1: assetMap(bigZombieDownFrameOrigins[1]),
  big_zombie_facing_right_2: assetMap(bigZombieDownFrameOrigins[2]),
  big_zombie_facing_up_0: assetMap(bigZombieDownFrameOrigins[0]),
  big_zombie_facing_up_1: assetMap(bigZombieDownFrameOrigins[1]),
  big_zombie_facing_up_2: assetMap(bigZombieDownFrameOrigins[2]),
  ...createCharacterAssets("bat_zombie", batFrames, 48, 240),
  ...createCharacterAssets("player", playerFrames),
  ...createCharacterAssets("fast_zombie", zombieFastFrames, 289, 19),
  ...createCharacterAssets("player_wdc", playerWdcFrames, 493, 190),
  ...createDirectionalFrames(swingDownFrameOrigins, "swing"),
  ...createDirectionalFrames(zombieSwingDownFrameOrigins, "zombie_swing"),
  ...createSpriteFrames({ key: "explosion", x: 0, y: 128, totalFrames: 5, sheet: "items" }),
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
      characters: await this.imageManager.load("/sheets/characters-sheet.png"),
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
    const image = this.get(keyWithFrame as Asset);
    if (!image) {
      throw new Error(`Image not found: ${keyWithFrame}`);
    }
    return image;
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
  return item.itemType as Asset;
}
