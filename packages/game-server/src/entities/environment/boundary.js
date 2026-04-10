import { Entities } from "@shared/constants";
import Positionable from "@/extensions/positionable";
import Collidable from "@/extensions/collidable";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
export class Boundary extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers) {
        super(gameManagers, Entities.BOUNDARY);
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Collidable(this).setSize(size));
    }
    setPosition(position) {
        this.getExt(Positionable).setPosition(position);
    }
    setSize(size) {
        this.getExt(Positionable).setSize(size);
        this.getExt(Collidable).setSize(size);
    }
}
