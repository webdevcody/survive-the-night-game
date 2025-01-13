import { IEntityManager } from "../../../managers/types";
import { Weapon, WEAPON_TYPES } from "./weapon";
import { Direction } from "../../direction";
import { PlayerAttackedEvent } from "../../events/server-sent/player-attacked-event";
import { Entities } from "@survive-the-night/game-shared/src/constants";
import Destructible from "../../extensions/destructible";

export class Knife extends Weapon {
  private static readonly ATTACK_RANGE = 20;
  private static readonly DAMAGE = 1;

  constructor(entityManager: IEntityManager) {
    super(entityManager, WEAPON_TYPES.KNIFE);
  }

  public attack(playerId: string, position: { x: number; y: number }, facing: Direction): void {
    // Find nearby entities that can be damaged
    const nearbyEntities = this.getEntityManager().getNearbyEntities(position, Knife.ATTACK_RANGE, [
      Entities.ZOMBIE,
      Entities.PLAYER,
    ]);

    // Damage any entities within range
    for (const entity of nearbyEntities) {
      if (entity.getId() === playerId) continue; // Don't damage self
      if (entity.hasExt(Destructible)) {
        entity.getExt(Destructible).damage(Knife.DAMAGE);
      }
    }

    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: WEAPON_TYPES.KNIFE,
        })
      );
  }
}
