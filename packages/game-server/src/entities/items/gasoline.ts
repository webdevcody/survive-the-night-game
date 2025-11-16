import Carryable from "@/extensions/carryable";
import Combustible from "@/extensions/combustible";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import { Fire } from "@/entities/environment/fire";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { ExplosionEvent } from "@/events/server-sent/explosion-event";
import { ItemState } from "@/types/entity";

export class Gasoline extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  public static readonly DEFAULT_COUNT = 1;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.GASOLINE);

    const count = itemState?.count ?? Gasoline.DEFAULT_COUNT;
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("gasoline"));
    this.addExtension(new Destructible(this).setMaxHealth(1).setHealth(itemState?.health ?? 1).onDeath(this.onDeath.bind(this)));
    this.addExtension(new Combustible(this, (type) => new Fire(gameManagers), 12, 64)); // More fires and larger spread than default
    this.addExtension(new Carryable(this, "gasoline").setItemState({ count }));
    this.addExtension(new Placeable(this));
    this.addExtension(new Groupable(this, "enemy"));
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
