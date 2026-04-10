import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import { weaponRegistry } from "@shared/entities";
import { applyWeaponRecoil } from "@/entities/util/recoil";
import PoolManager from "@shared/util/pool-manager";
export class Weapon extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers, weaponKey) {
        super(gameManagers, weaponKey);
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName(weaponKey));
        this.addExtension(new Carryable(this, weaponKey));
    }
    interact(entityId) {
        this.getExt(Carryable).pickup(entityId);
    }
    getConfig() {
        return weaponRegistry.get(this.getType());
    }
    applyRecoil(player, facing, aimAngle, strengthScale = 1) {
        var _a;
        const recoilBase = (_a = this.getConfig().stats.recoilKnockback) !== null && _a !== void 0 ? _a : 0;
        const recoilStrength = recoilBase * strengthScale;
        applyWeaponRecoil({
            player,
            facing,
            aimAngle,
            strength: recoilStrength,
        });
    }
}
