import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import TriggerCooldownAttacker from "@/extensions/trigger-cooldown-attacker";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import PoolManager from "@/util/pool-manager";
import { getConfig } from "@shared/config";
/**
 * A spike trap which only hurts zombies who step on it. Can be picked up and placed again.
 */
export class Spikes extends Entity {
    static get SIZE() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers, itemState) {
        var _a;
        super(gameManagers, Entities.SPIKES);
        const count = (_a = itemState === null || itemState === void 0 ? void 0 : itemState.count) !== null && _a !== void 0 ? _a : Spikes.DEFAULT_COUNT;
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        // TriggerCooldownAttacker handles finding and attacking nearby entities
        // No need for Triggerable since it had no callback and was redundant
        this.addExtension(new TriggerCooldownAttacker(this, {
            damage: getConfig().world.SPIKES_DAMAGE,
            victimType: Entities.ZOMBIE,
            cooldown: 1,
            includePlayersInBattleRoyale: true, // Allow targeting other players in Battle Royale
        }));
        this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("spikes"));
        this.addExtension(new Carryable(this, "spikes").setItemState({ count }));
        this.addExtension(new Placeable(this));
    }
    interact(entityId) {
        const carryable = this.getExt(Carryable);
        // Use helper method to preserve count when picking up dropped spikes
        carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, Spikes.DEFAULT_COUNT));
    }
}
Spikes.DEFAULT_COUNT = 1;
