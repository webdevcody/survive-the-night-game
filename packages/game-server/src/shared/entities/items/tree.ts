import { ServerSocketManager } from "@/managers/server-socket-manager";
import { EntityManager } from "../../../managers/entity-manager";
import { Entities, Entity } from "../../entities";
import { Interactive, Positionable, Carryable } from "../../extensions";
import { Player } from "../player";

export class Tree extends Entity {
  public static readonly Size = 16;
  private socketManager: ServerSocketManager;

  constructor(entityManager: EntityManager, socketManager: ServerSocketManager) {
    super(entityManager, Entities.TREE);
    this.socketManager = socketManager;

    this.extensions = [
      new Positionable(this).setSize(Tree.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("wood"),
      new Carryable(this, "wood"),
    ];
  }

  private interact(player: Player): void {
    this.getExt(Carryable).pickup(player);
  }
}
