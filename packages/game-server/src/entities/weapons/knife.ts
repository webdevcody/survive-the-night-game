import Destructible from "@/extensions/destructible";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { Direction } from "../../../../game-shared/src/util/direction";
import { Weapon } from "@/entities/weapons/weapon";
import { WEAPON_TYPES } from "@shared/types/weapons";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
export class Knife extends Weapon {
  private static readonly ATTACK_RANGE = 20;
  private static readonly DAMAGE = 1;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, WEAPON_TYPES.KNIFE);
  }

  public attack(playerId: string, position: Vector2, facing: Direction): void {
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
