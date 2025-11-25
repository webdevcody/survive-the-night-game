import { itemRegistry } from "../entities/item-registry";
import { weaponRegistry } from "../entities/weapon-registry";
import { resourceRegistry } from "../entities/resource-registry";

/**
 * Item Type Registry
 * Maps item type strings (items, weapons, resources) to unique numeric IDs (0-255, 1 byte)
 * This allows efficient serialization of item types over the network
 */
class ItemTypeRegistry {
  private typeToId: Map<string, number> = new Map();
  private idToType: Map<number, string> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize the registry from all item/weapon/resource registries
   * Must be called after registries are populated
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Collect all item types from all registries
    const allTypes: string[] = [];

    // Add items
    itemRegistry.getAll().forEach((item) => {
      allTypes.push(item.id);
    });

    // Add weapons
    weaponRegistry.getAll().forEach((weapon) => {
      allTypes.push(weapon.id);
    });

    // Add resources
    resourceRegistry.getAll().forEach((resource) => {
      allTypes.push(resource.id);
    });

    // Sort for consistent ordering across server/client
    const sortedTypes = [...new Set(allTypes)].sort();

    if (sortedTypes.length > 255) {
      throw new Error(
        `Too many item types (${sortedTypes.length}). Maximum is 256 (0-255)`
      );
    }

    // Assign IDs starting from 0
    sortedTypes.forEach((type, index) => {
      this.typeToId.set(type, index);
      this.idToType.set(index, type);
    });

    this.initialized = true;
  }

  /**
   * Encode an item type string to a numeric ID (0-255)
   */
  encode(type: string): number {
    // Auto-initialize if not already initialized
    if (!this.initialized) {
      this.initialize();
    }
    const id = this.typeToId.get(type);
    if (id === undefined) {
      throw new Error(`Unknown item type: ${type}`);
    }
    return id;
  }

  /**
   * Decode a numeric ID (0-255) to an item type string
   */
  decode(id: number): string {
    // Auto-initialize if not already initialized
    if (!this.initialized) {
      this.initialize();
    }
    if (id < 0 || id > 255) {
      throw new Error(`Invalid item type ID: ${id} (must be 0-255)`);
    }
    const type = this.idToType.get(id);
    if (type === undefined) {
      throw new Error(`Unknown item type ID: ${id}`);
    }
    return type;
  }

  /**
   * Check if the registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get total number of registered item types
   */
  size(): number {
    if (!this.initialized) {
      this.initialize();
    }
    return this.typeToId.size;
  }
}

// Singleton instance
export const itemTypeRegistry = new ItemTypeRegistry();
