import Ignitable from "@/extensions/ignitable";
import Illuminated from "@/extensions/illuminated";
import Positionable from "@/extensions/positionable";
import Triggerable from "@/extensions/trigger";
import { IGameManagers } from "@/managers/types";
import { Entities, Zombies } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { IEntity } from "@/entities/types";

export class CampsiteFire extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.CAMPSITE_FIRE);

    this.addExtension(new Positionable(this).setSize(CampsiteFire.Size));
    this.addExtension(
      new Triggerable(this, CampsiteFire.Size, [
        ...Zombies.filter((z) => z !== Entities.BAT_ZOMBIE),
        Entities.PLAYER,
      ]).setOnEntityEntered(this.catchFire.bind(this))
    );
    // Campsite fire is permanent - no Expirable extension
    this.addExtension(new Illuminated(this, 150));
  }

  catchFire(entity: IEntity) {
    if (!entity.hasExt(Ignitable)) {
      entity.addExtension(new Ignitable(entity));
    }
  }
}
