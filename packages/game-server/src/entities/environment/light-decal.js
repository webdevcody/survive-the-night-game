import Illuminated from "@/extensions/illuminated";
import Positionable from "@/extensions/positionable";
import { Entities } from "@/constants";
import { getConfig } from "@shared/config";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
/** Map-placed invisible light (same radius as a torch on the ground). */
export class LightDecal extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers) {
        super(gameManagers, Entities.LIGHT_DECAL);
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Illuminated(this, getConfig().world.LIGHT_RADIUS_PLAYER));
    }
}
