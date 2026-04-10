import Carryable from "@/extensions/carryable";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@shared/config";
export class WallLevel3 extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers, itemState) {
        var _a, _b;
        super(gameManagers, "wall_level_3");
        const count = (_a = itemState === null || itemState === void 0 ? void 0 : itemState.count) !== null && _a !== void 0 ? _a : WallLevel3.DEFAULT_COUNT;
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Collidable(this).setSize(size));
        this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("fortified wall"));
        this.addExtension(new Destructible(this)
            .setMaxHealth(getConfig().world.WALL_LEVEL_3_MAX_HEALTH)
            .setHealth((_b = itemState === null || itemState === void 0 ? void 0 : itemState.health) !== null && _b !== void 0 ? _b : getConfig().world.WALL_LEVEL_3_MAX_HEALTH)
            .onDeath(() => this.onDeath()));
        this.addExtension(new Carryable(this, "wall_level_3").setItemState({
            count,
        }));
        this.addExtension(new Placeable(this));
    }
    interact(entityId) {
        const entity = this.getEntityManager().getEntityById(entityId);
        if (!entity)
            return;
        const carryable = this.getExt(Carryable);
        const stackableOptions = Carryable.createStackablePickupOptions(carryable, WallLevel3.DEFAULT_COUNT);
        // Extend merge strategy to also preserve health
        const originalMergeStrategy = stackableOptions.mergeStrategy;
        stackableOptions.mergeStrategy = (existing, pickup) => {
            var _a;
            const merged = originalMergeStrategy(existing, pickup);
            return Object.assign(Object.assign({}, merged), { health: (_a = pickup === null || pickup === void 0 ? void 0 : pickup.health) !== null && _a !== void 0 ? _a : getConfig().world.WALL_LEVEL_3_MAX_HEALTH });
        };
        // Include health in pickup state
        stackableOptions.state = Object.assign(Object.assign({}, stackableOptions.state), { health: this.getExt(Destructible).getHealth() });
        carryable.pickup(entityId, stackableOptions);
    }
    onDeath() {
        this.getEntityManager().markEntityForRemoval(this);
    }
}
WallLevel3.DEFAULT_COUNT = 1;
