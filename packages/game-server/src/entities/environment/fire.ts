import Expirable from "@/extensions/expirable";
import Ignitable from "@/extensions/ignitable";
import Illuminated from "@/extensions/illuminated";
import Positionable from "@/extensions/positionable";
import Triggerable from "@/extensions/trigger";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { Entity } from "@shared/geom/entity";
import { IEntity } from "@shared/geom/types";

export class Fire extends Entity {
  public static readonly Size = 16;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.FIRE);

    this.extensions = [
      new Positionable(this).setSize(16),
      new Triggerable(this, 16, 16, [Entities.ZOMBIE, Entities.PLAYER]).setOnEntityEntered(
        this.catchFire.bind(this)
      ),
      new Expirable(this, 8),
      new Illuminated(this, 150),
    ];
  }

  catchFire(entity: IEntity) {
    if (!entity.hasExt(Ignitable)) {
      entity.addExtension(new Ignitable(entity));
    }
  }
}
