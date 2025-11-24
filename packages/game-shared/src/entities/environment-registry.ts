export interface EnvironmentAssetConfig {
  assetKey: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  sheet: string; // Required - must specify which sprite sheet to use
  totalFrames?: number; // For animated assets
}

export interface EnvironmentConfig {
  id: string;
  category: "resource" | "structure" | "obstacle";
  assets: EnvironmentAssetConfig;
}

class EnvironmentRegistry {
  private environments = new Map<string, EnvironmentConfig>();

  register(config: EnvironmentConfig): void {
    if (!config.assets.sheet) {
      throw new Error(
        `Environment "${config.id}" is missing required 'sheet' property in assets. ` +
          `All environments must specify which sprite sheet to use.`
      );
    }
    this.environments.set(config.id, config);
  }

  get(id: string): EnvironmentConfig | undefined {
    return this.environments.get(id);
  }

  getAll(): EnvironmentConfig[] {
    return Array.from(this.environments.values());
  }

  getAllEnvironmentIds(): string[] {
    return Array.from(this.environments.keys());
  }

  has(id: string): boolean {
    return this.environments.has(id);
  }
}

export const environmentRegistry = new EnvironmentRegistry();
