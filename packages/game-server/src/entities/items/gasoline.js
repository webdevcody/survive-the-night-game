import Carryable from "@/extensions/carryable";
import Combustible from "@/extensions/combustible";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import { Fire } from "@/entities/environment/fire";
import PoolManager from "@shared/util/pool-manager";
import { ExplosionEvent } from "../../../../game-shared/src/events/server-sent/events/explosion-event";
export class Gasoline extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers, itemState) {
        var _a, _b;
        super(gameManagers, Entities.GASOLINE);
        const count = (_a = itemState === null || itemState === void 0 ? void 0 : itemState.count) !== null && _a !== void 0 ? _a : Gasoline.DEFAULT_COUNT;
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("gasoline"));
        this.addExtension(new Destructible(this)
            .setMaxHealth(1)
            .setHealth((_b = itemState === null || itemState === void 0 ? void 0 : itemState.health) !== null && _b !== void 0 ? _b : 1)
            .onDeath(this.onDeath.bind(this)));
        this.addExtension(new Combustible(this, (type) => new Fire(gameManagers), 12, 64)); // More fires and larger spread than default
        this.addExtension(new Carryable(this, "gasoline").setItemState({ count }));
        this.addExtension(new Placeable(this));
        this.addExtension(new Groupable(this, "enemy"));
    }
    interact(entityId) {
        const carryable = this.getExt(Carryable);
        // Use helper method to preserve count when picking up dropped gasoline
        carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, Gasoline.DEFAULT_COUNT));
    }
    onDeath() {
        this.getExt(Combustible).onDeath();
        this.getEntityManager()
            .getBroadcaster()
            .broadcastEvent(new ExplosionEvent({
            position: this.getExt(Positionable).getCenterPosition(),
        }));
        this.getEntityManager().markEntityForRemoval(this);
    }
}
Gasoline.DEFAULT_COUNT = 1;
