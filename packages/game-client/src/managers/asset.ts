/**
 * Asset Manager
 *
 * This module handles sprite asset loading and management for the game client.
 * It automatically generates asset maps from entity registries (weapons, items, projectiles,
 * zombies, characters, etc.) and provides utilities to load and access sprite assets from
 * sprite sheets. The AssetManager class loads sprite sheets, crops individual sprites,
 * and caches them for efficient rendering. It also provides helper functions to retrieve
 * assets with directional variants and animation frames.
 */

import {
  Direction,
  isDirectionLeft,
  isDirectionRight,
  isDirectionDown,
  isDirectionUp,
} from "../../../game-shared/src/util/direction";
import { InventoryItem } from "../../../game-shared/src/util/inventory";
import { CropOptions, ImageManager } from "@/managers/image";
import {
  zombieRegistry,
  weaponRegistry,
  itemRegistry,
  resourceRegistry,
  decalRegistry,
  projectileRegistry,
  environmentRegistry,
  characterRegistry,
} from "@shared/entities";

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

function createCharacterAssets(
  name: string,
  frames: ReturnType<typeof createCharacterFrames>,
  deadX?: number,
  deadY?: number,
  deadSheet?: string
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
    assets[`${name}_dead`] = assetMap({ x: deadX, y: deadY, sheet: deadSheet || "characters" });
  }

  // Add directional frames
  const directions = ["down", "left", "up"] as const;
  directions.forEach((direction) => {
    frames[direction].forEach((frame, index) => {
      assets[`${name}_facing_${direction}_${index}`] = assetMap(frame);
    });
  });

  directions.forEach((direction) => {
    assets[`${name}_facing_${direction}`] = assetMap(frames[direction][0]);
  });

  // add right frames for non index
  assets[`${name}_facing_right`] = assetMap({ ...frames.left[0], flipX: true });

  // Add right frames (flipped from left sprites)
  frames.right.forEach((frame, index) => {
    assets[`${name}_facing_right_${index}`] = loadFlipXAsset(frame);
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

// Helper function to generate character-like assets from a config with frameLayout
function generateCharacterAssetsFromConfig(config: {
  assets: {
    assetPrefix: string;
    frameLayout: {
      startX: number;
      downY: number;
      leftY: number;
      upY: number;
      totalFrames: number;
      sheet?: string;
    };
    deadFrame?: {
      x: number;
      y: number;
      sheet?: string;
    };
  };
}) {
  const frames = createCharacterFrames({
    startX: config.assets.frameLayout.startX,
    downY: config.assets.frameLayout.downY,
    leftY: config.assets.frameLayout.leftY,
    upY: config.assets.frameLayout.upY,
    totalFrames: config.assets.frameLayout.totalFrames,
    sheet: config.assets.frameLayout.sheet || "default",
  });

  return createCharacterAssets(
    config.assets.assetPrefix,
    frames,
    config.assets.deadFrame?.x,
    config.assets.deadFrame?.y,
    config.assets.deadFrame?.sheet
  );
}

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

function createWeaponAssets(
  assetPrefix: string,
  spritePositions: {
    right: { x: number; y: number };
    down: { x: number; y: number };
    up: { x: number; y: number };
  },
  sheet: string = "default"
) {
  return {
    [assetPrefix]: assetMap({ x: spritePositions.right.x, y: spritePositions.right.y, sheet }),
    [`${assetPrefix}_facing_down`]: assetMap({
      x: spritePositions.down.x,
      y: spritePositions.down.y,
      sheet,
    }),
    [`${assetPrefix}_facing_left`]: assetMap({
      x: spritePositions.right.x,
      y: spritePositions.right.y,
      flipX: true,
      sheet,
    }),
    [`${assetPrefix}_facing_right`]: assetMap({
      x: spritePositions.right.x,
      y: spritePositions.right.y,
      sheet,
    }),
    [`${assetPrefix}_facing_up`]: assetMap({
      x: spritePositions.up.x,
      y: spritePositions.up.y,
      sheet,
    }),
  };
}

function createSimpleAsset(
  assetKey: string,
  x: number,
  y: number,
  width?: number,
  height?: number,
  sheet: string = "default",
  totalFrames?: number
) {
  if (totalFrames) {
    const assets: Record<string, CropOptions & { sheet: string }> = {};
    for (let i = 0; i < totalFrames; i++) {
      assets[`${assetKey}_${i}`] = assetMap({ x: x + i * tileSize, y, width, height, sheet });
    }
    return assets;
  }

  return {
    [assetKey]: assetMap({ x, y, width, height, sheet }),
  };
}

function createAnimatedAsset(
  assetKey: string,
  frameCount: number,
  startX: number,
  startY: number,
  sheet: string = "default"
) {
  const assets: Record<string, CropOptions & { sheet: string }> = {};

  // Base asset
  assets[assetKey] = assetMap({ x: startX, y: startY, sheet });

  // Individual frames
  for (let i = 0; i < frameCount; i++) {
    assets[`${assetKey}_${i}`] = assetMap({ x: startX + i * tileSize, y: startY, sheet });
  }

  return assets;
}

// Generic helper to merge assets from multiple configs
function mergeAssetsFromConfigs<T>(
  configs: T[],
  assetGenerator: (config: T) => Record<string, CropOptions & { sheet: string }>
): Record<string, CropOptions & { sheet: string }> {
  return configs.reduce(
    (acc, config) => ({
      ...acc,
      ...assetGenerator(config),
    }),
    {}
  );
}

// Ensure registries are populated before generating assets
// Importing from @shared/entities triggers registration code
// Force evaluation of entities/index.ts to ensure registration happens
import "@shared/entities";

const weaponConfigs = weaponRegistry.getAll();
const itemConfigs = itemRegistry.getAll();
const resourceConfigs = resourceRegistry.getAll();

export const assetsMap = {
  // Auto-generate all weapon assets from registry
  ...mergeAssetsFromConfigs(weaponConfigs, (config) => {
    const assets = createWeaponAssets(
      config.assets.assetPrefix,
      config.assets.spritePositions,
      config.assets.sheet || "default"
    );
    return assets;
  }),
  // Auto-generate all item assets from registry
  ...mergeAssetsFromConfigs(itemConfigs, (config) =>
    createSimpleAsset(
      config.assets.assetKey,
      config.assets.x,
      config.assets.y,
      config.assets.width,
      config.assets.height,
      config.assets.sheet || "default",
      config.assets.totalFrames
    )
  ),
  // Auto-generate all resource assets from registry
  ...mergeAssetsFromConfigs(resourceConfigs, (config) =>
    createSimpleAsset(
      config.assets.assetKey,
      config.assets.x,
      config.assets.y,
      config.assets.width,
      config.assets.height,
      config.assets.sheet || "default",
      config.assets.totalFrames
    )
  ),
  // Auto-generate all projectile assets from registry
  ...mergeAssetsFromConfigs(projectileRegistry.getAll(), (config) =>
    createSimpleAsset(
      config.assets.assetKey,
      config.assets.x,
      config.assets.y,
      config.assets.width,
      config.assets.height,
      config.assets.sheet || "default"
    )
  ),
  // Auto-generate all environment assets from registry
  // Filter out entities that use special sheets (like "collidables") that aren't in the standard asset system
  ...mergeAssetsFromConfigs(
    environmentRegistry.getAll().filter((config) => {
      const sheet = config.assets.sheet || "default";
      // Only include assets that use standard sheets
      return sheet === "default" || sheet === "items" || sheet === "characters" || sheet === "ground";
    }),
    (config) =>
      createSimpleAsset(
        config.assets.assetKey,
        config.assets.x,
        config.assets.y,
        config.assets.width,
        config.assets.height,
        config.assets.sheet || "default",
        config.assets.totalFrames
      )
  ),
  // Auto-generate all decal assets from registry
  ...mergeAssetsFromConfigs(decalRegistry.getAll(), (config) => {
    if (config.assets.type === "single" && config.assets.position) {
      return createSimpleAsset(
        config.assets.assetKey,
        config.assets.position.x,
        config.assets.position.y,
        undefined,
        undefined,
        config.assets.position.sheet || "default"
      );
    } else if (config.assets.type === "animated" && config.assets.frameLayout) {
      return createAnimatedAsset(
        config.assets.assetKey,
        config.assets.frameCount!,
        config.assets.frameLayout.startX,
        config.assets.frameLayout.startY,
        config.assets.frameLayout.sheet || "default"
      );
    } else if (config.assets.type === "directional" && config.assets.directionalFrames) {
      const frameOrigins = getFrameOrigins({
        startX: config.assets.directionalFrames.startX,
        startY: config.assets.directionalFrames.startY,
        totalFrames: config.assets.directionalFrames.totalFrames,
        sheet: config.assets.directionalFrames.sheet || "items",
      });
      return createDirectionalFrames(frameOrigins, config.assets.assetKey);
    }
    return {};
  }),
  // Auto-generate all zombie assets from registry
  ...mergeAssetsFromConfigs(zombieRegistry.getAll(), generateCharacterAssetsFromConfig),
  // Auto-generate all character assets from registry
  ...mergeAssetsFromConfigs(characterRegistry.getAll(), generateCharacterAssetsFromConfig),
} as const;

export type Asset = keyof typeof assetsMap;

export const assetsCache = {} as { [K in Asset]: HTMLImageElement };

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

export type LoadProgressCallback = (progress: number, total: number, stage: string) => void;

export class AssetManager implements ImageLoader {
  private imageManager = new ImageManager();
  private sheets: Record<string, HTMLImageElement> = {};
  private loaded = false;

  public async load(onProgress?: LoadProgressCallback): Promise<void> {
    if (this.loaded) {
      return;
    }

    // Load all sprite sheets (4 total)
    const sheetPaths = [
      { key: "default", path: "/tile-sheet.png" },
      { key: "items", path: "/sheets/items-sheet.png" },
      { key: "characters", path: "/sheets/characters-sheet.png" },
      { key: "ground", path: "/sheets/ground.png" },
    ];

    const loadedSheets: Record<string, HTMLImageElement> = {};

    for (let i = 0; i < sheetPaths.length; i++) {
      const { key, path } = sheetPaths[i];
      onProgress?.(i, sheetPaths.length, `Loading sprite sheet: ${key}`);
      loadedSheets[key] = await this.imageManager.load(path);
    }

    this.sheets = loadedSheets;

    // Report progress for cache population
    onProgress?.(sheetPaths.length, sheetPaths.length, "Processing sprites...");
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
      // Debug: Log available assets that match the prefix
      const availableAssets = Object.keys(assetsMap).filter((k) =>
        String(k).startsWith(String(key))
      );
      console.error(
        `Tried getting an asset with direction that is not registered '${keyWithDirection}'. ` +
          `Base key: '${key}', Available assets with prefix:`,
        availableAssets
      );
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
        const cropOptions = assetsMap[asset] as CropOptions & { sheet: string };
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
  // Check if it's a weapon first - weapons use assetPrefix
  const weaponConfig = weaponRegistry.get(item.itemType as any);
  if (weaponConfig) {
    return weaponConfig.assets.assetPrefix as Asset;
  }
  // Check if it's a resource - resources use assetKey
  const resourceConfig = resourceRegistry.get(item.itemType);
  if (resourceConfig) {
    return resourceConfig.assets.assetKey as Asset;
  }
  // Otherwise, use itemType directly (for regular items)
  return item.itemType as Asset;
}

/**
 * Get sprite info for an asset key (exported for React components)
 */
export function getAssetSpriteInfo(assetKey: string): {
  sheet: string;
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  const spriteInfo = assetsMap[assetKey as Asset];

  if (!spriteInfo) {
    return null;
  }

  return {
    sheet: spriteInfo.sheet || "default",
    x: spriteInfo.x,
    y: spriteInfo.y,
    width: spriteInfo.width || 16,
    height: spriteInfo.height || 16,
  };
}
