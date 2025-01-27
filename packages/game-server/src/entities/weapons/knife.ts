import Destructible from "@/extensions/destructible";
import { IGameManagers } from "@/managers/types";
import { Direction } from "../../../../game-shared/src/util/direction";
import { Weapon } from "@/entities/weapons/weapon";
import { WEAPON_TYPES } from "@shared/types/weapons";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import Positionable from "@/extensions/positionable";
import { knockBack } from "./helpers";
import { Player } from "@/entities/player";

export class Knife extends Weapon {
  private static readonly ATTACK_RANGE = 24;
  private static readonly DAMAGE = 1;
  private static readonly PUSH_DISTANCE = 12;
  private static readonly COOLDOWN = 0.5;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, WEAPON_TYPES.KNIFE);
  }

  public getCooldown(): number {
    return Knife.COOLDOWN;
  }

  public attack(playerId: string, position: Vector2, facing: Direction): void {
    const nearbyEnemies = this.getEntityManager().getNearbyEnemies(
      position,
      Knife.ATTACK_RANGE + 24
    );

    const targetZombie = nearbyEnemies.find((entity) => {
      const zombiePos = entity.getExt(Positionable).getCenterPosition();
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
      const wasAlive = !destructible.isDead();
      destructible.damage(Knife.DAMAGE);
      knockBack(this.getEntityManager(), targetZombie, facing, Knife.PUSH_DISTANCE);

      if (wasAlive && destructible.isDead()) {
        const player = this.getEntityManager().getEntityById(playerId);
        if (player instanceof Player) {
          player.incrementKills();
        }
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
