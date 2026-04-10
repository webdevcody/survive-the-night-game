import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
export class MinersHat extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers) {
        super(gameManagers, Entities.MINERS_HAT);
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("miners hat"));
        this.addExtension(new Carryable(this, "miners_hat"));
    }
    interact(entityId) {
        this.getExt(Carryable).pickup(entityId);
    }
}
