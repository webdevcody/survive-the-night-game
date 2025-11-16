import { Entities } from "../constants";
import { EntityType } from "../types/entity";

/**
 * Entity Type Registry
 * Maps entity type strings to unique numeric IDs (0-255, 1 byte)
 * This allows efficient serialization of entity types
 */
class EntityTypeRegistry {
  private typeToId: Map<EntityType, number> = new Map();
  private idToType: Map<number, EntityType> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize the registry from the Entities constant
   * Must be called after Entities is populated
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    const entityTypes = Object.values(Entities) as EntityType[];

    // Sort entity types for consistent ordering
    const sortedTypes = [...entityTypes].sort();

    // Assign IDs starting from 0
    sortedTypes.forEach((type, index) => {
      if (index > 255) {
        throw new Error(`Too many entity types (${sortedTypes.length}). Maximum is 256 (0-255)`);
      }
      this.typeToId.set(type, index);
      this.idToType.set(index, type);
    });

    this.initialized = true;
  }

  /**
   * Encode an entity type string to a numeric ID (0-255)
   */
  encode(type: EntityType): number {
    // Auto-initialize if not already initialized
    if (!this.initialized) {
      this.initialize();
    }
    const id = this.typeToId.get(type);
    if (id === undefined) {
      throw new Error(`Unknown entity type: ${type}`);
    }
    return id;
  }

  /**
   * Decode a numeric ID (0-255) to an entity type string
   */
  decode(id: number): EntityType {
    // Auto-initialize if not already initialized
    if (!this.initialized) {
      this.initialize();
    }
    if (id < 0 || id > 255) {
      throw new Error(`Invalid entity type ID: ${id} (must be 0-255)`);
    }
    const type = this.idToType.get(id);
    if (type === undefined) {
      throw new Error(`Unknown entity type ID: ${id}`);
    }
    return type;
  }

  /**
   * Check if the registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const entityTypeRegistry = new EntityTypeRegistry();
