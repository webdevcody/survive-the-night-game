import { BehaviorConfigs } from "./behavior-configs";

/** Wearable equipment slots (same as inventory EquipmentSlotKey). */
export type ArmorEquipmentSlotKey =
  | "head"
  | "shoulders"
  | "torso"
  | "legs"
  | "shoes"
  | "back"
  | "hands";

export interface ItemAssetConfig {
  assetKey: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  sheet: string; // Required - must specify which sprite sheet to use
  totalFrames?: number;
}

export interface ItemConfig extends BehaviorConfigs {
  id: string;
  category: "consumable" | "ammo" | "placeable" | "throwable" | "structure" | "armor";
  assets: ItemAssetConfig;
  hideWhenSelected?: boolean; // If true, don't render overlay when item is selected/equipped
  placeable?: boolean; // If true, item can be placed as a structure
  placeSound?: string; // Sound type to play when item is placed (e.g., "build"). If not set, no sound plays.
  healable?: boolean; // If true, item can be used for quick heal (must also be consumable)
  lightIntensity?: number; // Light radius provided when item is equipped or in inventory (0 = no light)
  /** If true, item is armor / wearable equipment (equip slots, encumbrance, etc.). */
  wearable?: boolean;
  /**
   * When equipped, whether to draw this item as a sprite overlay on the player body.
   * - true: always draw when in an equipment slot
   * - false: never draw (e.g. invisible trinket)
   * - undefined: draw when wearable and equipmentSlot are both set
   */
  rendersOnPlayerOverlay?: boolean;
  /** When set, item may only be equipped in this slot. */
  equipmentSlot?: ArmorEquipmentSlotKey;
  duration?: number; // Duration in seconds for consumable effects (e.g., energy drink)
  upgradeTo?: string; // If set, placing this item on an existing structure of the same type will upgrade it to this item type
  autoPickup?: boolean; // If false, item will never be auto-picked up (defaults to undefined/null for default behavior)
  isPassthrough?: boolean; // If true, players can walk through this entity (used for collision prediction)
  /** Mass for encumbrance / stamina drain (kg per logical item; stacks multiply). Default 0.1 in code. */
  weightKg?: number;
}

class ItemRegistry {
  private items = new Map<string, ItemConfig>();

  register(config: ItemConfig): void {
    if (!config.assets.sheet) {
      throw new Error(
        `Item "${config.id}" is missing required 'sheet' property in assets. ` +
          `All items must specify which sprite sheet to use.`,
      );
    }
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
