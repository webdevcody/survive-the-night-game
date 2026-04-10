import { Entities } from "@shared/constants";
import Carryable from "@/extensions/carryable";
import Consumable from "@/extensions/consumable";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Positionable from "@/extensions/positionable";
import InfiniteRun from "@/extensions/infinite-run";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
import { itemRegistry } from "@shared/entities";
export class EnergyDrink extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers, itemState) {
        var _a;
        super(gameManagers, Entities.ENERGY_DRINK);
        const count = (_a = itemState === null || itemState === void 0 ? void 0 : itemState.count) !== null && _a !== void 0 ? _a : EnergyDrink.DEFAULT_COUNT;
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("energy drink"));
        this.addExtension(new Consumable(this).onConsume(this.consume.bind(this)));
        this.addExtension(new Carryable(this, "energy_drink").setItemState({ count }));
    }
    consume(entityId, idx) {
        var _a, _b;
        const entity = this.getEntityManager().getEntityById(entityId);
        if (!entity) {
            return;
        }
        // Get duration from config
        const config = itemRegistry.get("energy_drink");
        const duration = (_a = config === null || config === void 0 ? void 0 : config.duration) !== null && _a !== void 0 ? _a : 20; // Default to 20 seconds if not configured
        // Remove existing infinite run extension if present (don't stack)
        if (entity.hasExt(InfiniteRun)) {
            entity.removeExtension(entity.getExt(InfiniteRun));
        }
        // Add infinite run extension to player
        entity.addExtension(new InfiniteRun(entity, duration));
        const inventory = entity.getExt(Inventory);
        if (!inventory) {
            return;
        }
        // Handle stackable energy drinks - decrement count instead of removing
        const energyDrinkItem = inventory.getItems()[idx];
        if (((_b = energyDrinkItem === null || energyDrinkItem === void 0 ? void 0 : energyDrinkItem.state) === null || _b === void 0 ? void 0 : _b.count) && energyDrinkItem.state.count > 1) {
            // Decrement count
            inventory.updateItemState(idx, { count: energyDrinkItem.state.count - 1 });
        }
        else {
            // Remove item if count is 1 or undefined
            inventory.removeItem(idx);
        }
    }
    interact(entityId) {
        const entity = this.getEntityManager().getEntityById(entityId);
        if (!entity) {
            return;
        }
        const carryable = this.getExt(Carryable);
        // Use helper method to preserve count when picking up dropped energy drinks
        carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, EnergyDrink.DEFAULT_COUNT));
    }
}
EnergyDrink.DEFAULT_COUNT = 1;
