import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { ClientEntityBase } from "@/extensions/client-entity";
import { clientEntityOverrideRegistry } from "./entity-override-registry";
import { itemRegistry, resourceRegistry } from "@shared/entities";
import { GenericClientEntity } from "./items/generic-client-entity";
import { registerCustomClientEntities } from "./register-custom-entities";

// Register all custom client entity classes at module load time
registerCustomClientEntities();

export class EntityFactory {
  private assetManager: AssetManager;

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  public createEntity(data: RawEntity): ClientEntityBase {
    if (!data || !data.type) {
      throw new Error(`Invalid entity data: ${JSON.stringify(data)}`);
    }

    // First check override registry for custom client entity classes
    const overrideConstructor = clientEntityOverrideRegistry.get(data.type);

    if (overrideConstructor) {
      return new overrideConstructor(data, this.assetManager) as ClientEntityBase;
    }

    // Fallback to generic entity generation from configs
    const genericEntity = this.createGenericEntity(data);
    if (genericEntity) {
      return genericEntity;
    }

    throw new Error(`Unknown entity type: ${data.type}`);
  }

  private createGenericEntity(data: RawEntity): ClientEntityBase | null {
    // Try to create from item registry
    const itemConfig = itemRegistry.get(data.type);
    if (itemConfig) {
      return new GenericClientEntity(data, this.assetManager, itemConfig);
    }

    // Try to create from resource registry
    const resourceConfig = resourceRegistry.get(data.type);
    if (resourceConfig) {
      // Resources use the same GenericClientEntity but with ResourceConfig
      // We need to adapt ResourceConfig to work with GenericClientEntity
      // GenericClientEntity expects ItemConfig, but ResourceConfig has similar structure
      // For now, we'll create a compatible object
      const adaptedConfig = {
        id: resourceConfig.id,
        category: "consumable" as const, // Resources render like consumables
        assets: resourceConfig.assets,
      };
      return new GenericClientEntity(data, this.assetManager, adaptedConfig as any);
    }

    // Could add other registry checks here (weapons, environment, etc.)
    // For now, we'll focus on items and resources

    return null;
  }
}
