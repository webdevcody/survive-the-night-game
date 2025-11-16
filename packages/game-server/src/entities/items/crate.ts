import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { getConfig } from "@shared/config";
import { Entity } from "@/entities/entity";
import { ItemState } from "@/types/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Groupable from "@/extensions/groupable";
import Static from "@/extensions/static";
import Inventory from "@/extensions/inventory";

export class Crate extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.CRATE);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Collidable(this).setSize(size));
    this.addExtension(
      new Destructible(this)
        .setMaxHealth(getConfig().world.CRATE_HEALTH)
        .setHealth(itemState?.health ?? getConfig().world.CRATE_HEALTH)
        .onDeath(() => this.onDeath())
    );
    this.addExtension(new Groupable(this, "enemy"));
    this.addExtension(
      new Inventory(this, gameManagers.getBroadcaster())
        .addRandomItem()
        .addRandomItem()
        .addRandomItem()
    );
    this.addExtension(new Static(this));
  }

  private onDeath(): void {
    this.getEntityManager().markEntityForRemoval(this);
    this.getExt(Inventory).scatterItems(this.getExt(Positionable).getPosition());
  }

}
