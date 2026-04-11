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
import { Player } from "@/entities/players/player";
import {
  LEGACY_RANDOM_DROP_TABLE,
  type ZombieDropTableEntry,
} from "@shared/config/zombie-drop-tables";

export class Crate extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(
    gameManagers: IGameManagers,
    itemCount: number = 3,
    dropTable: ZombieDropTableEntry[] = LEGACY_RANDOM_DROP_TABLE,
  ) {
    super(gameManagers, Entities.CRATE);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    const inventory = new Inventory(this, gameManagers.getBroadcaster());
    for (let i = 0; i < itemCount; i++) {
      inventory.addRandomItem(1, dropTable);
    }
    this.addExtension(inventory);
    this.addExtension(new Static(this));
    this.addExtension(
      new Interactive(this).onInteract(this.onLooted.bind(this)).setDisplayName("search")
    );
  }

  private onLooted(entityId?: number): void {
    if (typeof entityId === "number") {
      const player = this.getEntityManager().getEntityById(entityId);
      if (player instanceof Player) {
        player.addProfessionXp("scavenging", 6);
      }
    }
    const inventory = this.getExt(Inventory);
    if (inventory) {
      inventory.scatterItems(this.getExt(Positionable).getPosition());
    }

    this.getEntityManager().markEntityForRemoval(this);
    this.getGameManagers().getBroadcaster().broadcastEvent(new LootEvent(this.getId()));
  }
}
