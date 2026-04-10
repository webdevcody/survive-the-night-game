import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
export class Tree extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers) {
        super(gameManagers, Entities.TREE);
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Interactive(this)
            .onInteract(this.interact.bind(this))
            .setDisplayName("wood")
            .setAutoPickupEnabled(false));
    }
    interact(entityId) {
        const player = this.getEntityManager().getEntityById(entityId);
        if (!player)
            return;
        const inventory = player.getExt(Inventory);
        if (!inventory.addOrMergeStack({ itemType: "wood", state: { count: 1 } })) {
            return;
        }
        this.getEntityManager().markEntityForRemoval(this);
    }
}
