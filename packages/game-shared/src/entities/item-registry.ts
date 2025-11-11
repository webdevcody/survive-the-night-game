import { BehaviorConfigs } from "./behavior-configs";

export interface ItemAssetConfig {
  assetKey: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  sheet?: string;
  totalFrames?: number;
}

export interface ItemConfig extends BehaviorConfigs {
  id: string;
  category: "consumable" | "ammo" | "placeable" | "throwable" | "structure";
  assets: ItemAssetConfig;
  hideWhenSelected?: boolean; // If true, don't render overlay when item is selected/equipped
}

class ItemRegistry {
  private items = new Map<string, ItemConfig>();

  register(config: ItemConfig): void {
    this.items.set(config.id, config);
  }

  get(id: string): ItemConfig | undefined {
    return this.items.get(id);
  }

  getAll(): ItemConfig[] {
    return Array.from(this.items.values());
  }

  getAllItemIds(): string[] {
    return Array.from(this.items.keys());
  }

  has(id: string): boolean {
    return this.items.has(id);
  }
}

export const itemRegistry = new ItemRegistry();
