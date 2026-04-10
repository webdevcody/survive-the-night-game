import Expirable from "@/extensions/expirable";
import Ignitable from "@/extensions/ignitable";
import Illuminated from "@/extensions/illuminated";
import Positionable from "@/extensions/positionable";
import Triggerable from "@/extensions/trigger";
import { Entities, Zombies } from "@/constants";
import { getConfig } from "@shared/config";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
export class Fire extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers) {
        super(gameManagers, Entities.FIRE);
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Triggerable(this, Fire.Size, [
            ...Zombies.filter((z) => z !== Entities.BAT_ZOMBIE),
            Entities.PLAYER,
        ]).setOnEntityEntered(this.catchFire.bind(this)));
        this.addExtension(new Expirable(this, 6));
        this.addExtension(new Illuminated(this, getConfig().world.LIGHT_RADIUS_FIRE));
    }
    catchFire(entity) {
        if (!entity.hasExt(Ignitable)) {
            entity.addExtension(new Ignitable(entity));
        }
    }
}
