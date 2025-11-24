import { BehaviorConfigs } from "./behavior-configs";

export interface ResourceAssetConfig {
  assetKey: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  sheet: string; // Required - must specify which sprite sheet to use
  totalFrames?: number;
}

export interface ResourceConfig extends BehaviorConfigs {
  id: string;
  assets: ResourceAssetConfig;
}

class ResourceRegistry {
  private resources = new Map<string, ResourceConfig>();

  register(config: ResourceConfig): void {
    if (!config.assets.sheet) {
      throw new Error(
        `Resource "${config.id}" is missing required 'sheet' property in assets. ` +
          `All resources must specify which sprite sheet to use.`
      );
    }
    this.resources.set(config.id, config);
  }

  get(id: string): ResourceConfig | undefined {
    return this.resources.get(id);
  }

  getAll(): ResourceConfig[] {
    return Array.from(this.resources.values());
  }

  getAllResourceTypes(): string[] {
    return Array.from(this.resources.keys());
  }

  has(id: string): boolean {
    return this.resources.has(id);
  }
}

export const resourceRegistry = new ResourceRegistry();

