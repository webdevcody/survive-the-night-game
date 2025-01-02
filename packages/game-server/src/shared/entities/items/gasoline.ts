import { EntityManager } from "../../../managers/entity-manager";
import { Entity, Entities } from "../../entities";
import { Combustible, Interactive, Positionable, Collidable, Destructible } from "../../extensions";
import { Player } from "../player";
import { Fire } from "../triggers/fire";

export class Gasoline extends Entity {
  public static readonly Size = 16;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.GASOLINE);

    this.extensions = [
      new Positionable(this).setSize(Gasoline.Size),
      new Interactive(this).onInteract(this.interact.bind(this)),
      new Destructible(this).setMaxHealth(1).setHealth(1).onDeath(this.onDeath.bind(this)),
      new Combustible(this, (type) => new Fire(this.getEntityManager()), 12, 32), // More fires and larger spread than default
    ];
  }

  private interact(player: Player): void {
    if (player.isInventoryFull()) {
      return;
    }

    player.getInventory().push({ key: "Gasoline" });
    this.getEntityManager().markEntityForRemoval(this);
  }

  private onDeath(): void {
    this.getExt(Combustible).onDeath();
    this.getEntityManager().markEntityForRemoval(this);
  }
}
