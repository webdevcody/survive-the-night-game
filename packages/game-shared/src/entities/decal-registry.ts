export interface DecalFrameConfig {
  assetKey: string;
  type: "single" | "animated" | "directional";
  frameCount?: number; // For animated decals
  frameLayout?: {
    startX: number;
    startY: number;
    sheet?: string;
  };
  // For directional decals (like swing animations)
  directionalFrames?: {
    startX: number;
    startY: number;
    totalFrames: number;
    sheet?: string;
  };
  // For simple single-frame decals
  position?: {
    x: number;
    y: number;
    sheet?: string;
  };
}

export interface DecalConfig {
  id: string;
  category: "effect" | "animation" | "structure";
  assets: DecalFrameConfig;
}

class DecalRegistry {
  private decals = new Map<string, DecalConfig>();

  register(config: DecalConfig): void {
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
