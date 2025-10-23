import Carryable from "@/extensions/carryable";
import Combustible from "@/extensions/combustible";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import { Fire } from "@/entities/environment/fire";
import Vector2 from "@/util/vector2";
import { ExplosionEvent } from "@/events/server-sent/explosion-event";

export class Gasoline extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.GASOLINE);

    this.extensions = [
      new Positionable(this).setSize(Gasoline.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("gasoline"),
      new Destructible(this).setMaxHealth(1).setHealth(1).onDeath(this.onDeath.bind(this)),
      new Combustible(this, (type) => new Fire(gameManagers), 12, 64), // More fires and larger spread than default
      new Carryable(this, "gasoline"),
      new Groupable(this, "enemy"),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }

  private onDeath(): void {
    this.getExt(Combustible).onDeath();
    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new ExplosionEvent({
          position: this.getExt(Positionable).getCenterPosition(),
        })
      );
    this.getEntityManager().markEntityForRemoval(this);
  }
}
