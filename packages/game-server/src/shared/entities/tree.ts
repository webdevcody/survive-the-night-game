import { EntityManager } from "../../managers/entity-manager";
import { Entities, Entity } from "../entities";
import { Interactive, Positionable } from "../extensions";
import { Player } from "./player";
import { SOUND_TYPES } from "./sound";
import { createSoundAtPosition } from "./sound";

export class Tree extends Entity {
  public static readonly Size = 16;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.TREE);

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

    createSoundAtPosition(
      this.getEntityManager(),
      SOUND_TYPES.PICK_UP_ITEM,
      this.getExt(Positionable).getPosition()
    );
  }
}
