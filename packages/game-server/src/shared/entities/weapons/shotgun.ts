import { IEntityManager } from "../../../managers/types";
import { Bullet } from "../bullet";
import { Direction } from "../../direction";
import { PlayerAttackedEvent } from "../../events/server-sent/player-attacked-event";
import { Weapon, WEAPON_TYPES } from "./weapon";
import Inventory from "../../extensions/inventory";

export class Shotgun extends Weapon {
  private static readonly SPREAD_ANGLE = 8; // degrees

  constructor(entityManager: IEntityManager) {
    super(entityManager, WEAPON_TYPES.SHOTGUN);
  }

  public attack(playerId: string, position: { x: number; y: number }, facing: Direction): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);
    const ammoItem = inventory.getItems().find((item) => item.key === "shotgun_ammo");

    if (!ammoItem || !ammoItem.state?.count || ammoItem.state.count <= 0) {
      return; // No ammo available
    }

    // Consume ammo
    const ammoIndex = inventory.getItems().findIndex((item) => item.key === "shotgun_ammo");
    inventory.updateItemState(ammoIndex, { count: ammoItem.state.count - 1 });

    // Create 3 bullets with spread
    for (let i = -1; i <= 1; i++) {
      const bullet = new Bullet(this.getEntityManager());
      bullet.setPosition(position);
      bullet.setDirectionWithOffset(facing, i * Shotgun.SPREAD_ANGLE);
      this.getEntityManager().addEntity(bullet);
    }

    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: WEAPON_TYPES.SHOTGUN,
        })
      );
  }
}
