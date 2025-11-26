/**
 * Asset Manager
 *
 * Handles sprite asset loading and management for the game client.
 * Generates asset maps from entity registries and provides utilities
 * to load and access sprite assets from sprite sheets.
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
import { PLAYER_COLORS, PLAYER_COLOR_HEX, PlayerColor } from "@shared/commands/commands";

// Ensure registries are populated before generating assets
import "@shared/entities";
import { getConfig } from "@shared/config";

const TILE_SIZE = getConfig().world.TILE_SIZE;

// Valid sprite sheets that can be loaded
const SPRITE_SHEETS = {
  default: "/tile-sheet.png",
  items: "/sheets/items-sheet.png",
  characters: "/sheets/characters-sheet.png",
  ground: "/sheets/ground.png",
} as const;

type SheetName = keyof typeof SPRITE_SHEETS;

interface AssetDefinition extends CropOptions {
  sheet: string;
}

// ============================================================================
// Asset Definition Helpers
// ============================================================================

function defineAsset(
  x: number,
  y: number,
  sheet: string,
  options: Partial<CropOptions> = {}
): AssetDefinition {
  return {
    x,
    y,
    sheet,
    width: options.width ?? TILE_SIZE,
    height: options.height ?? TILE_SIZE,
    flipX: options.flipX ?? false,
    rotation: options.rotation ?? 0,
    tintColor: options.tintColor,
  };
}

// ============================================================================
// Weapon Asset Generation
// ============================================================================

function generateWeaponAssets(): Record<string, AssetDefinition> {
  const assets: Record<string, AssetDefinition> = {};

  for (const config of weaponRegistry.getAll()) {
    const { assetPrefix, spritePositions, sheet } = config.assets;

    assets[assetPrefix] = defineAsset(spritePositions.right.x, spritePositions.right.y, sheet);
    assets[`${assetPrefix}_facing_down`] = defineAsset(
      spritePositions.down.x,
      spritePositions.down.y,
      sheet
    );
    assets[`${assetPrefix}_facing_left`] = defineAsset(
      spritePositions.right.x,
      spritePositions.right.y,
      sheet,
      { flipX: true }
    );
    assets[`${assetPrefix}_facing_right`] = defineAsset(
      spritePositions.right.x,
      spritePositions.right.y,
      sheet
    );
    assets[`${assetPrefix}_facing_up`] = defineAsset(
      spritePositions.up.x,
      spritePositions.up.y,
      sheet
    );
  }

  return assets;
}

// ============================================================================
// Simple Asset Generation (Items, Resources, Projectiles, Environment)
// ============================================================================

interface SimpleAssetConfig {
  assetKey: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  sheet: string;
  totalFrames?: number;
}

function generateSimpleAssets(
  configs: { assets: SimpleAssetConfig }[],
  filter?: (config: { assets: SimpleAssetConfig }) => boolean
): Record<string, AssetDefinition> {
  const assets: Record<string, AssetDefinition> = {};

  for (const config of configs) {
    if (filter && !filter(config)) continue;

    const { assetKey, x, y, width, height, sheet, totalFrames } = config.assets;

    if (totalFrames) {
      for (let i = 0; i < totalFrames; i++) {
        assets[`${assetKey}_${i}`] = defineAsset(x + i * TILE_SIZE, y, sheet, { width, height });
      }
    } else {
      assets[assetKey] = defineAsset(x, y, sheet, { width, height });
    }
  }

  return assets;
}

// ============================================================================
// Decal Asset Generation
// ============================================================================

function generateDecalAssets(): Record<string, AssetDefinition> {
  const assets: Record<string, AssetDefinition> = {};

  for (const config of decalRegistry.getAll()) {
    const { assetKey, type, frameCount, frameLayout, directionalFrames, position } = config.assets;

    if (type === "single" && position) {
      assets[assetKey] = defineAsset(position.x, position.y, position.sheet);
    } else if (type === "animated" && frameLayout) {
      assets[assetKey] = defineAsset(frameLayout.startX, frameLayout.startY, frameLayout.sheet);
      for (let i = 0; i < (frameCount ?? 0); i++) {
        assets[`${assetKey}_${i}`] = defineAsset(
          frameLayout.startX + i * TILE_SIZE,
          frameLayout.startY,
          frameLayout.sheet
        );
      }
    } else if (type === "directional" && directionalFrames) {
      const { startX, startY, totalFrames, sheet } = directionalFrames;

      assets[assetKey] = defineAsset(startX, startY, sheet);

      const rotations: Record<string, number> = {
        up: 180,
        down: 0,
        left: 90,
        right: 270,
      };

      for (const [dirName, rotation] of Object.entries(rotations)) {
        for (let i = 0; i < totalFrames; i++) {
          assets[`${assetKey}_facing_${dirName}_${i}`] = defineAsset(
            startX + i * TILE_SIZE,
            startY,
            sheet,
            { rotation }
          );
        }
      }
    }
  }

  return assets;
}

// ============================================================================
// Character/Zombie Asset Generation (with directional animation frames)
// ============================================================================

interface FrameLayout {
  startX: number;
  downY: number;
  leftY: number;
  upY: number;
  totalFrames: number;
  sheet: string;
}

interface DeadFrame {
  x: number;
  y: number;
  sheet: string;
}

function generateCharacterFrameAssets(
  assetPrefix: string,
  frameLayout: FrameLayout,
  deadFrame?: DeadFrame,
  tintColor?: string
): Record<string, AssetDefinition> {
  const assets: Record<string, AssetDefinition> = {};
  const { startX, downY, leftY, upY, totalFrames, sheet } = frameLayout;

  const directions = {
    down: downY,
    left: leftY,
    up: upY,
  } as const;

  // Base asset (first down frame)
  assets[assetPrefix] = defineAsset(startX, downY, sheet, { tintColor });

  // Indexed frames (for animation)
  for (let i = 0; i < totalFrames; i++) {
    assets[`${assetPrefix}_${i}`] = defineAsset(startX + i * TILE_SIZE, downY, sheet, { tintColor });
  }

  // Dead frame
  if (deadFrame) {
    assets[`${assetPrefix}_dead`] = defineAsset(deadFrame.x, deadFrame.y, deadFrame.sheet, {
      tintColor,
    });
  }

  // Directional frames
  for (const [dirName, y] of Object.entries(directions)) {
    // Base directional frame
    assets[`${assetPrefix}_facing_${dirName}`] = defineAsset(startX, y, sheet, { tintColor });

    // Indexed directional frames
    for (let i = 0; i < totalFrames; i++) {
      assets[`${assetPrefix}_facing_${dirName}_${i}`] = defineAsset(startX + i * TILE_SIZE, y, sheet, {
        tintColor,
      });
    }
  }

  // Right frames (flipped from left)
  assets[`${assetPrefix}_facing_right`] = defineAsset(startX, leftY, sheet, {
    flipX: true,
    tintColor,
  });

  for (let i = 0; i < totalFrames; i++) {
    assets[`${assetPrefix}_facing_right_${i}`] = defineAsset(startX + i * TILE_SIZE, leftY, sheet, {
      flipX: true,
      tintColor,
    });
  }

  return assets;
}

function generateZombieAssets(): Record<string, AssetDefinition> {
  const assets: Record<string, AssetDefinition> = {};

  for (const config of zombieRegistry.getAll()) {
    const { assetPrefix, frameLayout, deadFrame } = config.assets;
    Object.assign(
      assets,
      generateCharacterFrameAssets(assetPrefix, frameLayout, deadFrame)
    );
  }

  return assets;
}

function generateCharacterAssets(): Record<string, AssetDefinition> {
  const assets: Record<string, AssetDefinition> = {};

  for (const config of characterRegistry.getAll()) {
    const { assetPrefix, frameLayout, deadFrame } = config.assets;

    // Base character assets
    Object.assign(
      assets,
      generateCharacterFrameAssets(assetPrefix, frameLayout, deadFrame)
    );

    // Generate colored variants for all player colors
    for (const colorValue of Object.values(PLAYER_COLORS)) {
      if (colorValue === "none") continue;

      const colorHex = PLAYER_COLOR_HEX[colorValue as PlayerColor];
      const coloredPrefix = `${assetPrefix}_${colorValue}`;

      Object.assign(
        assets,
        generateCharacterFrameAssets(coloredPrefix, frameLayout, deadFrame, colorHex)
      );
    }
  }

  return assets;
}

// ============================================================================
// Environment Asset Generation (with special sheet filtering)
// ============================================================================

function generateEnvironmentAssets(): Record<string, AssetDefinition> {
  // Filter out entities that use special sheets not in the standard asset system
  const standardSheets = new Set(["default", "items", "characters", "ground"]);

  return generateSimpleAssets(
    environmentRegistry.getAll(),
    (config) => standardSheets.has(config.assets.sheet)
  );
}

// ============================================================================
// Combined Asset Map
// ============================================================================

export const assetsMap = {
  ...generateWeaponAssets(),
  ...generateSimpleAssets(itemRegistry.getAll()),
  ...generateSimpleAssets(resourceRegistry.getAll()),
  ...generateSimpleAssets(projectileRegistry.getAll()),
  ...generateEnvironmentAssets(),
  ...generateDecalAssets(),
  ...generateZombieAssets(),
  ...generateCharacterAssets(),
} as const;

export type Asset = keyof typeof assetsMap;

export const assetsCache = {} as { [K in Asset]: HTMLImageElement };

// ============================================================================
// Image Loader Interface
// ============================================================================

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

// ============================================================================
// Asset Manager Class
// ============================================================================

export class AssetManager implements ImageLoader {
  private imageManager = new ImageManager();
  private sheets: Record<string, HTMLImageElement> = {};
  private loaded = false;

  public async load(onProgress?: LoadProgressCallback): Promise<void> {
    if (this.loaded) return;

    const sheetEntries = Object.entries(SPRITE_SHEETS);

    for (let i = 0; i < sheetEntries.length; i++) {
      const [key, path] = sheetEntries[i];
      onProgress?.(i, sheetEntries.length, `Loading sprite sheet: ${key}`);
      this.sheets[key] = await this.imageManager.load(path);
    }

    onProgress?.(sheetEntries.length, sheetEntries.length, "Processing sprites...");
    await this.populateCache();

    this.loaded = true;
  }

  public get(assetKey: Asset): HTMLImageElement {
    if (!this.loaded) {
      throw new Error(
        "Tried getting an asset without having it loaded. Call `.load()` first."
      );
    }
    return assetsCache[assetKey];
  }

  public getSheet(sheetName: string): HTMLImageElement | null {
    return this.loaded ? this.sheets[sheetName] ?? null : null;
  }

  public getFrameIndex(key: Asset, frameIndex: number): HTMLImageElement {
    return this.get(`${key}_${frameIndex}` as Asset);
  }

  public getFrameWithDirection(
    key: Asset,
    direction: Direction | null,
    frameIndex: number
  ): HTMLImageElement {
    const keyWithDirection = this.addDirectionSuffix(key, direction);
    const keyWithFrame = `${keyWithDirection}_${frameIndex}` as Asset;
    const image = this.get(keyWithFrame);
    if (!image) {
      throw new Error(`Image not found: ${keyWithFrame}`);
    }
    return image;
  }

  public getWithDirection(key: Asset, direction: Direction | null): HTMLImageElement {
    const keyWithDirection = this.addDirectionSuffix(key, direction);

    let asset = assetsCache[keyWithDirection as Asset];
    if (asset === undefined) {
      asset = assetsCache[key];
    }

    if (asset === undefined) {
      const availableAssets = Object.keys(assetsMap).filter((k) =>
        String(k).startsWith(String(key))
      );
      console.error(
        `Asset not found: '${keyWithDirection}'. Base key: '${key}'. Available:`,
        availableAssets
      );
      throw new Error(`Asset not found: '${keyWithDirection}'`);
    }

    return asset;
  }

  private addDirectionSuffix(key: Asset, direction: Direction | null): string {
    const keyStr = String(key);
    if (direction === null) return keyStr;

    if (isDirectionLeft(direction)) return `${keyStr}_facing_left`;
    if (isDirectionRight(direction)) return `${keyStr}_facing_right`;
    if (isDirectionDown(direction)) return `${keyStr}_facing_down`;
    if (isDirectionUp(direction)) return `${keyStr}_facing_up`;

    return keyStr;
  }

  private async populateCache(): Promise<void> {
    await Promise.all(
      Object.keys(assetsMap).map(async (assetKey) => {
        const asset = assetKey as Asset;
        const cropOptions = assetsMap[asset] as AssetDefinition;
        const sheet = this.sheets[cropOptions.sheet];

        if (!sheet) {
          throw new Error(
            `Sheet "${cropOptions.sheet}" not found for asset "${assetKey}". ` +
              `Available sheets: ${Object.keys(this.sheets).join(", ")}`
          );
        }

        assetsCache[asset] = await this.imageManager.crop(sheet, cropOptions);
      })
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getItemAssetKey(item: InventoryItem): Asset {
  const weaponConfig = weaponRegistry.get(item.itemType as any);
  if (weaponConfig) {
    return weaponConfig.assets.assetPrefix as Asset;
  }

  const resourceConfig = resourceRegistry.get(item.itemType);
  if (resourceConfig) {
    return resourceConfig.assets.assetKey as Asset;
  }

  return item.itemType as Asset;
}

export function getAssetSpriteInfo(assetKey: string): {
  sheet: string;
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  // Check if it's a weapon
  const weaponConfig = weaponRegistry.get(assetKey as any);
  if (weaponConfig) {
    const spriteInfo = assetsMap[weaponConfig.assets.assetPrefix as Asset];
    if (spriteInfo) {
      return {
        sheet: spriteInfo.sheet,
        x: spriteInfo.x,
        y: spriteInfo.y,
        width: spriteInfo.width ?? TILE_SIZE,
        height: spriteInfo.height ?? TILE_SIZE,
      };
    }
  }

  // Check if it's a zombie
  const zombieConfig = zombieRegistry.get(assetKey as any);
  if (zombieConfig) {
    const spriteInfo = assetsMap[zombieConfig.assets.assetPrefix as Asset];
    if (spriteInfo) {
      return {
        sheet: spriteInfo.sheet,
        x: spriteInfo.x,
        y: spriteInfo.y,
        width: spriteInfo.width ?? TILE_SIZE,
        height: spriteInfo.height ?? TILE_SIZE,
      };
    }
  }

  // Direct lookup
  const spriteInfo = assetsMap[assetKey as Asset];
  if (!spriteInfo) return null;

  return {
    sheet: spriteInfo.sheet,
    x: spriteInfo.x,
    y: spriteInfo.y,
    width: spriteInfo.width ?? TILE_SIZE,
    height: spriteInfo.height ?? TILE_SIZE,
  };
}
