import { Entities } from "@shared/constants";
import Carryable from "@/extensions/carryable";
import Consumable from "@/extensions/consumable";
import Destructible from "@/extensions/destructible";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
export class PainPills extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers, itemState) {
        var _a;
        super(gameManagers, Entities.PAIN_PILLS);
        const count = (_a = itemState === null || itemState === void 0 ? void 0 : itemState.count) !== null && _a !== void 0 ? _a : PainPills.DEFAULT_COUNT;
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("pain pills"));
        this.addExtension(new Consumable(this).onConsume(this.consume.bind(this)));
        this.addExtension(new Carryable(this, "pain_pills").setItemState({ count }));
    }
    consume(entityId, idx) {
        var _a;
        const entity = this.getEntityManager().getEntityById(entityId);
        if (!entity) {
            return;
        }
        const destructible = entity.getExt(Destructible);
        if (!destructible) {
            return;
        }
        const currentHealth = destructible.getHealth();
        const maxHealth = destructible.getMaxHealth();
        const healAmount = Math.min(PainPills.healingAmount, maxHealth - currentHealth);
        if (healAmount === 0) {
            return;
        }
        destructible.heal(healAmount);
        const inventory = entity.getExt(Inventory);
        if (!inventory) {
            return;
        }
        const item = inventory.getItems()[idx];
        if (((_a = item === null || item === void 0 ? void 0 : item.state) === null || _a === void 0 ? void 0 : _a.count) && item.state.count > 1) {
            inventory.updateItemState(idx, { count: item.state.count - 1 });
        }
        else {
            inventory.removeItem(idx);
        }
    }
    interact(entityId) {
        const entity = this.getEntityManager().getEntityById(entityId);
        if (!entity) {
            return;
        }
        const carryable = this.getExt(Carryable);
        carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, PainPills.DEFAULT_COUNT));
    }
}
PainPills.healingAmount = 2;
PainPills.DEFAULT_COUNT = 1;
