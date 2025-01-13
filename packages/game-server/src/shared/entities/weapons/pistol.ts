import { IEntityManager } from "../../../managers/types";
import { Weapon, WEAPON_TYPES } from "./weapon";
import { Bullet } from "../bullet";
import { Direction } from "../../direction";
import { PlayerAttackedEvent } from "../../events/server-sent/player-attacked-event";

export class Pistol extends Weapon {
  constructor(entityManager: IEntityManager) {
    super(entityManager, WEAPON_TYPES.PISTOL);
  }

  public attack(playerId: string, position: { x: number; y: number }, facing: Direction): void {
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
