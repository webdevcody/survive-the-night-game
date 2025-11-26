import Expirable from "@/extensions/expirable";
import Ignitable from "@/extensions/ignitable";
import Illuminated from "@/extensions/illuminated";
import Positionable from "@/extensions/positionable";
import Triggerable from "@/extensions/trigger";
import { IGameManagers } from "@/managers/types";
import { Entities, Zombies } from "@/constants";
import { getConfig } from "@shared/config";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { IEntity } from "@/entities/types";

export class Fire extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.FIRE);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Triggerable(this, Fire.Size, [
        ...Zombies.filter((z) => z !== Entities.BAT_ZOMBIE),
        Entities.PLAYER,
      ]).setOnEntityEntered(this.catchFire.bind(this))
    );
    this.addExtension(new Expirable(this, 6));
    this.addExtension(new Illuminated(this, getConfig().world.LIGHT_RADIUS_FIRE));
  }

  catchFire(entity: IEntity) {
    if (!entity.hasExt(Ignitable)) {
      entity.addExtension(new Ignitable(entity));
    }
  }
}
