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
import { ItemState } from "@/types/entity";

export class Gasoline extends Entity {
  public static readonly Size = new Vector2(16, 16);
  public static readonly DEFAULT_COUNT = 1;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.GASOLINE);

    const count = itemState?.count ?? Gasoline.DEFAULT_COUNT;

    this.extensions = [
      new Positionable(this).setSize(Gasoline.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("gasoline"),
      new Destructible(this).setMaxHealth(1).setHealth(itemState?.health ?? 1).onDeath(this.onDeath.bind(this)),
      new Combustible(this, (type) => new Fire(gameManagers), 12, 64), // More fires and larger spread than default
      new Carryable(this, "gasoline").setItemState({ count }),
      new Groupable(this, "enemy"),
    ];
  }

  private interact(entityId: string): void {
    const carryable = this.getExt(Carryable);
    // Use helper method to preserve count when picking up dropped gasoline
    carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, Gasoline.DEFAULT_COUNT));
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
