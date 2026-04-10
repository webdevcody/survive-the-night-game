import Carryable from "@/extensions/carryable";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { CoinPickupEvent } from "../../../../game-shared/src/events/server-sent/events/coin-pickup-event";
import { getConfig } from "@shared/config";
export class Coin extends StackableItem {
    constructor(gameManagers, itemState) {
        super(gameManagers, Entities.COIN, "coin", 1, "coin", itemState);
        this.getEntityManager().markEntityForRemoval(this, getConfig().entity.ENTITY_DESPAWN_TIME_MS);
    }
    getDefaultCount() {
        return 1;
    }
    interact(entityId) {
        const entity = this.getEntityManager().getEntityById(entityId);
        if (!entity) {
            return;
        }
        if (entity.isZombie()) {
            return;
        }
        this.getEntityManager().getBroadcaster().broadcastEvent(new CoinPickupEvent(this.getId()));
        const carryable = this.getExt(Carryable);
        const baseCount = this.getDefaultCount();
        const bonus = entity.getLuckCoinPickupBonus();
        carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, baseCount + bonus));
    }
}
