import Carryable from "@/extensions/carryable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { CoinPickupEvent } from "../../../../game-shared/src/events/server-sent/events/coin-pickup-event";
import { getConfig } from "@shared/config";
import { Player } from "@/entities/players/player";

export class Coin extends StackableItem {
  constructor(gameManagers: IGameManagers, itemState?: { count?: number }) {
    super(gameManagers, Entities.COIN, "coin", 1, "coin", itemState);

    this.getEntityManager().markEntityForRemoval(this, getConfig().entity.ENTITY_DESPAWN_TIME_MS);
  }

  protected getDefaultCount(): number {
    return 1;
  }

  protected interact(entityId: number): void {
    const entity = this.getEntityManager().getEntityById(entityId) as Player | undefined;
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
    carryable.pickup(
      entityId,
      Carryable.createStackablePickupOptions(carryable, baseCount + bonus),
    );
  }
}
