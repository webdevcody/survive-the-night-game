import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Static from "@/extensions/static";
import Inventory from "@/extensions/inventory";
import Interactive from "@/extensions/interactive";
import { LootEvent } from "../../../../game-shared/src/events/server-sent/events/loot-event";

export class Crate extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers, itemCount: number = 3) {
    super(gameManagers, Entities.CRATE);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    const inventory = new Inventory(this, gameManagers.getBroadcaster());
    for (let i = 0; i < itemCount; i++) {
      inventory.addRandomItem();
    }
    this.addExtension(inventory);
    this.addExtension(new Static(this));
    this.addExtension(
      new Interactive(this).onInteract(this.onLooted.bind(this)).setDisplayName("search")
    );
  }

  private onLooted(): void {
    const inventory = this.getExt(Inventory);
    if (inventory) {
      inventory.scatterItems(this.getExt(Positionable).getPosition());
    }

    this.getEntityManager().markEntityForRemoval(this);
    this.getGameManagers().getBroadcaster().broadcastEvent(new LootEvent(this.getId()));
  }
}
