export interface DecalFrameConfig {
  assetKey: string;
  type: "single" | "animated" | "directional";
  frameCount?: number; // For animated decals
  frameLayout?: {
    startX: number;
    startY: number;
    sheet: string; // Required when frameLayout is provided
  };
  // For directional decals (like swing animations)
  directionalFrames?: {
    startX: number;
    startY: number;
    totalFrames: number;
    sheet: string; // Required when directionalFrames is provided
  };
  // For simple single-frame decals
  position?: {
    x: number;
    y: number;
    sheet: string; // Required when position is provided
  };
}

export interface DecalConfig {
  id: string;
  category: "effect" | "animation" | "structure";
  assets: DecalFrameConfig;
  /**
   * Whether this decal entity blocks structure placement.
   * Defaults to true for safety, but should be false for visual-only decals like blood and acid.
   */
  blocksPlacement?: boolean;
}

class DecalRegistry {
  private decals = new Map<string, DecalConfig>();

  register(config: DecalConfig): void {
    const { assets } = config;

    if (assets.type === "single" && assets.position && !assets.position.sheet) {
      throw new Error(
        `Decal "${config.id}" has position but is missing required 'sheet' property. ` +
          `When position is provided, sheet must be specified.`
      );
    }
    if (assets.type === "animated" && assets.frameLayout && !assets.frameLayout.sheet) {
      throw new Error(
        `Decal "${config.id}" has frameLayout but is missing required 'sheet' property. ` +
          `When frameLayout is provided, sheet must be specified.`
      );
    }
    if (assets.type === "directional" && assets.directionalFrames && !assets.directionalFrames.sheet) {
      throw new Error(
        `Decal "${config.id}" has directionalFrames but is missing required 'sheet' property. ` +
          `When directionalFrames is provided, sheet must be specified.`
      );
    }

    this.decals.set(config.id, config);
  }

  get(id: string): DecalConfig | undefined {
    return this.decals.get(id);
  }

  getAll(): DecalConfig[] {
    return Array.from(this.decals.values());
  }

  getAllDecalIds(): string[] {
    return Array.from(this.decals.keys());
  }

  has(id: string): boolean {
    return this.decals.has(id);
  }
}

export const decalRegistry = new DecalRegistry();

/**
 * Checks if an entity type blocks structure placement.
 * Decals with blocksPlacement: false (like blood and acid) won't block placement.
 * All other entities block placement by default.
 * @param entityType The entity type to check
 * @returns true if the entity blocks placement, false otherwise
 */
export function entityBlocksPlacement(entityType: string): boolean {
  const decalConfig = decalRegistry.get(entityType);
  if (decalConfig) {
    // If it's a decal, check the blocksPlacement flag (defaults to true if not specified)
    return decalConfig.blocksPlacement !== false;
  }
  // Non-decal entities block placement by default
  return true;
}
