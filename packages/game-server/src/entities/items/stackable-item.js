import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
export class StackableItem extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    /**
     * Get the default count for a StackableItem class without instantiating it.
     * Subclasses should override this static method to return their default count.
     * If not overridden, this will attempt to create a temporary instance to get the count.
     */
    static getDefaultCount(constructor, gameManagers) {
        try {
            // Try to create a temporary instance to call getDefaultCount()
            // We pass undefined for itemState so it uses the default count
            const tempInstance = new constructor(gameManagers);
            return tempInstance.getDefaultCount();
        }
        catch (_a) {
            return undefined;
        }
    }
    constructor(gameManagers, entityType, itemType, defaultCount, displayName, itemState) {
        var _a;
        super(gameManagers, entityType);
        // Use count from itemState if provided, otherwise use defaultCount
        const count = (_a = itemState === null || itemState === void 0 ? void 0 : itemState.count) !== null && _a !== void 0 ? _a : defaultCount;
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName(displayName));
        this.addExtension(new Carryable(this, itemType).setItemState({
            count,
        }));
    }
    interact(entityId) {
        const entity = this.getEntityManager().getEntityById(entityId);
        if (!entity)
            return;
        const carryable = this.getExt(Carryable);
        // Use helper method to preserve count when picking up dropped items
        carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, this.getDefaultCount()));
    }
}
