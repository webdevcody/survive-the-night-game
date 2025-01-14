import { IEntityManager } from "../../../managers/types";
import { Weapon, WEAPON_TYPES } from "./weapon";
import { Bullet } from "../bullet";
import { Direction } from "../../direction";
import { PlayerAttackedEvent } from "../../events/server-sent/player-attacked-event";
import Inventory from "../../extensions/inventory";

export class Pistol extends Weapon {
  constructor(entityManager: IEntityManager) {
    super(entityManager, WEAPON_TYPES.PISTOL);
  }

  public attack(playerId: string, position: { x: number; y: number }, facing: Direction): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);
    const ammoItem = inventory.getItems().find((item) => item.key === "pistol_ammo");

    if (!ammoItem || !ammoItem.state?.count || ammoItem.state.count <= 0) {
      return; // No ammo available
    }

    // Consume ammo
    const ammoIndex = inventory.getItems().findIndex((item) => item.key === "pistol_ammo");
    inventory.updateItemState(ammoIndex, { count: ammoItem.state.count - 1 });

    const bullet = new Bullet(this.getEntityManager());
    bullet.setPosition(position);
    bullet.setDirection(facing);
    this.getEntityManager().addEntity(bullet);

    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: WEAPON_TYPES.PISTOL,
        })
      );
  }
}
