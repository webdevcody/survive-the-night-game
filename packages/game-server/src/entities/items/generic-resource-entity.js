import { Entity } from "@/entities/entity";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import PoolManager from "@shared/util/pool-manager";
import Inventory from "@/extensions/inventory";
/**
 * Generic resource entity that can be auto-generated from ResourceConfig.
 * Pickup merges into the player's inventory as a stackable item (item id matches resource id).
 */
export class GenericResourceEntity extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers, entityType, config) {
        super(gameManagers, entityType);
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        // Resources are interactive but not carryable - they're picked up directly
        const displayName = config.id.replace(/_/g, " "); // Convert "pistol_ammo" to "pistol ammo"
        this.addExtension(new Interactive(this)
            .onInteract(this.interact.bind(this))
            .setDisplayName(displayName)
            .setAutoPickupEnabled(false));
    }
    interact(entityId) {
        const player = this.getEntityManager().getEntityById(entityId);
        if (!player)
            return;
        const inventory = player.getExt(Inventory);
        const itemType = this.getType();
        if (!inventory.addOrMergeStack({ itemType, state: { count: 1 } })) {
            return;
        }
        this.getEntityManager().markEntityForRemoval(this);
    }
}
