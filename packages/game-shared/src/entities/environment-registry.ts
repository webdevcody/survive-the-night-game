export interface EnvironmentAssetConfig {
  assetKey: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  sheet?: string;
}

export interface EnvironmentConfig {
  id: string;
  category: "resource" | "structure" | "obstacle";
  assets: EnvironmentAssetConfig;
}

class EnvironmentRegistry {
  private environments = new Map<string, EnvironmentConfig>();

  register(config: EnvironmentConfig): void {
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
