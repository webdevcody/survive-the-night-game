import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
export class CraftingStation extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers, entityType, displayName) {
        super(gameManagers, entityType);
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Interactive(this).onInteract(() => { }).setDisplayName(displayName));
    }
    setPosition(position) {
        this.getExt(Positionable).setPosition(position);
    }
}
