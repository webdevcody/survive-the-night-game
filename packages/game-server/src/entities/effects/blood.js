import Expirable from "@/extensions/expirable";
import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
import { decalRegistry } from "@shared/entities";
export class Blood extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers) {
        // Get entity type from decal registry
        const bloodDecal = decalRegistry.get("blood");
        const entityType = (bloodDecal === null || bloodDecal === void 0 ? void 0 : bloodDecal.id) || "blood";
        super(gameManagers, entityType);
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Expirable(this, 10)); // Expires after 10 seconds
    }
}
