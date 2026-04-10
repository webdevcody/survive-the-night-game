import { Entity } from "@/entities/entity";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import Carryable from "@/extensions/carryable";
import Consumable from "@/extensions/consumable";
import Inventory from "@/extensions/inventory";
import PoolManager from "@shared/util/pool-manager";
/**
 * Generic item entity that can be auto-generated from ItemConfig
 * Used as a fallback when no custom entity class exists
 */
export class GenericItemEntity extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers, entityType, config) {
        super(gameManagers, entityType);
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        // Most items are interactive and carryable
        if (config.category !== "structure") {
            const displayName = config.id.replace(/_/g, " "); // Convert "pistol_ammo" to "pistol ammo"
            this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName(displayName));
            this.addExtension(new Carryable(this, config.id));
        }
        // Consumables get the Consumable extension
        if (config.category === "consumable") {
            this.addExtension(new Consumable(this).onConsume((entityId, idx) => {
                // Default consume behavior: just remove from inventory
                const entity = this.getEntityManager().getEntityById(entityId);
                if (entity === null || entity === void 0 ? void 0 : entity.hasExt(Inventory)) {
                    entity.getExt(Inventory).removeItem(idx);
                }
            }));
        }
    }
    interact(entityId) {
        const entity = this.getEntityManager().getEntityById(entityId);
        if (!entity)
            return;
        const carryable = this.getExt(Carryable);
        if (carryable) {
            carryable.pickup(entityId);
        }
    }
}
