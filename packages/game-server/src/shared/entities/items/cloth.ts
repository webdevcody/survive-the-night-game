import { EntityManager } from "../../../managers/entity-manager";
import { Entity, Entities } from "../../entities";
import { Interactive, Positionable } from "../../extensions";
import { Events } from "../../events";
import { Player } from "../player";

export class Cloth extends Entity {
  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.CLOTH);

    this.extensions = [
      new Positionable(this),
      new Interactive(this).init({
        eventName: Events.INTERACT,
      }),
    ];

    this.addEventListener(Events.INTERACT, (evt: CustomEventInit<Player>) => {
      const player = evt.detail;

      player?.getInventory().push({ key: "Cloth" });
      this.getEntityManager().markEntityForRemoval(this);
    });
  }
}
