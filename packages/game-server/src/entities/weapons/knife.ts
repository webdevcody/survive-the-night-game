import Destructible from "@/extensions/destructible";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { Direction } from "../../../../game-shared/src/util/direction";
import { Weapon } from "@/entities/weapons/weapon";
import { WEAPON_TYPES } from "@shared/types/weapons";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import Positionable from "@/extensions/positionable";

export class Knife extends Weapon {
  private static readonly ATTACK_RANGE = 48;
  private static readonly DAMAGE = 1;
  private static readonly PUSH_DISTANCE = 10;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, WEAPON_TYPES.KNIFE);
  }

  public attack(playerId: string, position: Vector2, facing: Direction): void {
    const nearbyZombies = this.getEntityManager().getNearbyEntities(position, undefined, [
      Entities.ZOMBIE,
    ]);

    const targetZombie = nearbyZombies.find((entity) => {
      const zombiePos = entity.getExt(Positionable).getPosition();
      const dx = zombiePos.x - position.x;
      const dy = zombiePos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const destructible = entity.getExt(Destructible);
      if (destructible.isDead()) return false;

      if (distance > Knife.ATTACK_RANGE) return false;

      if (facing === Direction.Right && dx < 0) return false;
      if (facing === Direction.Left && dx > 0) return false;
      if (facing === Direction.Up && dy > 0) return false;
      if (facing === Direction.Down && dy < 0) return false;

      return true;
    });

    if (targetZombie) {
      const destructible = targetZombie.getExt(Destructible);
      destructible.damage(Knife.DAMAGE);

      const positionable = targetZombie.getExt(Positionable);
      const position = positionable.getPosition();

      // Push zombie back based on facing direction
      if (facing === Direction.Right) {
        position.x += Knife.PUSH_DISTANCE;
      } else if (facing === Direction.Left) {
        position.x -= Knife.PUSH_DISTANCE;
      } else if (facing === Direction.Up) {
        position.y -= Knife.PUSH_DISTANCE;
      } else if (facing === Direction.Down) {
        position.y += Knife.PUSH_DISTANCE;
      }

      positionable.setPosition(position);
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
