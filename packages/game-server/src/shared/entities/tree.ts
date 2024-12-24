import { ServerSocketManager } from "@/managers/server-socket-manager";
import { EntityManager } from "../../managers/entity-manager";
import { Entities, Entity } from "../entities";
import { PlayerPickedUpItemEvent } from "../events/server-sent/pickup-item-event";
import { Interactive, Positionable } from "../extensions";
import { Player } from "./player";

export class Tree extends Entity {
  public static readonly Size = 16;
  private socketManager: ServerSocketManager;

  constructor(entityManager: EntityManager, socketManager: ServerSocketManager) {
    super(entityManager, Entities.TREE);
    this.socketManager = socketManager;

    this.extensions = [
      new Positionable(this).setSize(Tree.Size),
      new Interactive(this).onInteract(this.interact.bind(this)),
    ];
  }

  private interact(player: Player): void {
    if (player.isInventoryFull()) {
      return;
    }

    player.getInventory().push({ key: "Wood" });
    this.getEntityManager().markEntityForRemoval(this);

    this.socketManager.broadcastEvent(
      new PlayerPickedUpItemEvent({
        playerId: player.getId(),
        itemKey: "Wood",
      })
    );
  }
}
