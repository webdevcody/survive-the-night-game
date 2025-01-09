import { EntityManager } from "../../../managers/entity-manager";
import { Entities } from "../../entities";
import {
  Combustible,
  Interactive,
  Positionable,
  Destructible,
  Carryable,
  Groupable,
} from "../../extensions";
import { Player } from "../player";
import { Fire } from "../environment/fire";
import { Entity } from "../../entity";

export class Gasoline extends Entity {
  public static readonly Size = 16;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.GASOLINE);

    this.extensions = [
      new Positionable(this).setSize(Gasoline.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("gasoline"),
      new Destructible(this).setMaxHealth(1).setHealth(1).onDeath(this.onDeath.bind(this)),
      new Combustible(this, (type) => new Fire(this.getEntityManager()), 12, 64), // More fires and larger spread than default
      new Carryable(this, "gasoline"),
      new Groupable(this, "enemy"),
    ];
  }

  private interact(player: Player): void {
    this.getExt(Carryable).pickup(player);
  }

  private onDeath(): void {
    this.getExt(Combustible).onDeath();
    this.getEntityManager().markEntityForRemoval(this);
  }
}
