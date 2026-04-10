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
 * Level 3 spikes that deal 3 damage to zombies.
 */
export class SpikesLevel3 extends Entity {
    static get SIZE() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers, itemState) {
        var _a;
        super(gameManagers, "spikes_level_3");
        const count = (_a = itemState === null || itemState === void 0 ? void 0 : itemState.count) !== null && _a !== void 0 ? _a : SpikesLevel3.DEFAULT_COUNT;
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new TriggerCooldownAttacker(this, {
            damage: getConfig().world.SPIKES_LEVEL_3_DAMAGE,
            victimType: Entities.ZOMBIE,
            cooldown: 1,
            includePlayersInBattleRoyale: true, // Allow targeting other players in Battle Royale
        }));
        this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("deadly spikes"));
        this.addExtension(new Carryable(this, "spikes_level_3").setItemState({ count }));
        this.addExtension(new Placeable(this));
    }
    interact(entityId) {
        const carryable = this.getExt(Carryable);
        carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, SpikesLevel3.DEFAULT_COUNT));
    }
}
SpikesLevel3.DEFAULT_COUNT = 1;
