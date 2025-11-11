import { EntityType } from "@shared/types/entity";
import { IClientEntity } from "@/entities/util";
import { AssetManager } from "@/managers/asset";
import { RawEntity } from "@shared/types/entity";

type ClientEntityConstructor = new (
  data: RawEntity,
  assetManager: AssetManager,
  ...args: any[]
) => IClientEntity;

/**
 * Registry for custom client entity class overrides
 * When an entity type has a custom class registered here, it will be used instead of the generic one
 */
class ClientEntityOverrideRegistry {
  private overrides = new Map<EntityType, ClientEntityConstructor>();

  /**
   * Register a custom client entity class for a specific entity type
   */
  register(entityType: EntityType, constructor: ClientEntityConstructor): void {
    this.overrides.set(entityType, constructor);
  }

  /**
   * Get the custom client entity class for a specific entity type, or undefined if none exists
   */
  get(entityType: EntityType): ClientEntityConstructor | undefined {
    return this.overrides.get(entityType);
  }

  /**
   * Check if a custom client entity class exists for a specific entity type
   */
  has(entityType: EntityType): boolean {
    return this.overrides.has(entityType);
  }

  /**
   * Get all registered entity types
   */
  getAllEntityTypes(): EntityType[] {
    return Array.from(this.overrides.keys());
  }
}

export const clientEntityOverrideRegistry = new ClientEntityOverrideRegistry();
