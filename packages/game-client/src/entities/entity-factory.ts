import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { ClientEntityBase } from "@/extensions/client-entity";
import { clientEntityOverrideRegistry } from "./entity-override-registry";
import { itemRegistry, resourceRegistry } from "@shared/entities";
import { GenericClientEntity } from "./items/generic-client-entity";
import { registerCustomClientEntities } from "./register-custom-entities";
import { createEntityWithFactory, EntityFactoryAdapter } from "@shared/util/entity-factory-pattern";

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

    const adapter: EntityFactoryAdapter<ClientEntityBase> = {
      getOverrideConstructor: (type) => {
        const constructor = clientEntityOverrideRegistry.get(type);
        return constructor
          ? () => new constructor(data, this.assetManager) as ClientEntityBase
          : undefined;
      },
      createGenericFromItem: (type) => {
        const itemConfig = itemRegistry.get(type);
        if (itemConfig) {
          return new GenericClientEntity(data, this.assetManager, itemConfig);
        }
        return null;
      },
      createGenericFromResource: (type) => {
        const resourceConfig = resourceRegistry.get(type);
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
        return null;
      },
      logCreationFailure: (type, reason) => {
        throw new Error(`Unknown entity type: ${type} - ${reason}`);
      },
    };

    const entity = createEntityWithFactory(data.type, adapter);
    if (!entity) {
      throw new Error(`Unknown entity type: ${data.type}`);
    }
    return entity;
  }
}
