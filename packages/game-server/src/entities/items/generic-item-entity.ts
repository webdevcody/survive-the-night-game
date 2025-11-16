import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { EntityType } from "@/types/entity";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import Carryable from "@/extensions/carryable";
import Consumable from "@/extensions/consumable";
import Inventory from "@/extensions/inventory";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { ItemConfig } from "@shared/entities/item-registry";
import { Extension } from "@/extensions/types";

/**
 * Generic item entity that can be auto-generated from ItemConfig
 * Used as a fallback when no custom entity class exists
 */
export class GenericItemEntity extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers, entityType: EntityType, config: ItemConfig) {
    super(gameManagers, entityType);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));

    // Most items are interactive and carryable
    if (config.category !== "structure") {
      const displayName = config.id.replace(/_/g, " "); // Convert "pistol_ammo" to "pistol ammo"
      this.addExtension(
        new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName(displayName)
      );
      this.addExtension(new Carryable(this, config.id as any));
    }

    // Consumables get the Consumable extension
    if (config.category === "consumable") {
      this.addExtension(
        new Consumable(this).onConsume((entityId: string, idx: number) => {
          // Default consume behavior: just remove from inventory
          const entity = this.getEntityManager().getEntityById(entityId);
          if (entity?.hasExt(Inventory)) {
            entity.getExt(Inventory).removeItem(idx);
          }
        })
      );
    }
  }

  private interact(entityId: string): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) return;

    const carryable = this.getExt(Carryable);
    if (carryable) {
      carryable.pickup(entityId);
    }
  }
}
