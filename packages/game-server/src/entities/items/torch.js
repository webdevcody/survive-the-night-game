import Carryable from "@/extensions/carryable";
import Illuminated from "@/extensions/illuminated";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import { Entities } from "@/constants";
import { getConfig } from "@shared/config";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
export class Torch extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers) {
        super(gameManagers, Entities.TORCH);
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("torch"));
        this.addExtension(new Carryable(this, "torch"));
        this.addExtension(new Placeable(this));
        this.addExtension(new Illuminated(this, getConfig().world.LIGHT_RADIUS_PLAYER));
    }
    interact(entityId) {
        const carryable = this.getExt(Carryable);
        carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, Torch.DEFAULT_COUNT));
    }
}
Torch.DEFAULT_COUNT = 1;
