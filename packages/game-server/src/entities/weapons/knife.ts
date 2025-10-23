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
import { Entities, KNIFE_ATTACK_RANGE, Zombies } from "@/constants";
import { weaponRegistry } from "@shared/entities";

export class Knife extends Weapon {
  private config = weaponRegistry.get(WEAPON_TYPES.KNIFE)!;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, WEAPON_TYPES.KNIFE);
  }

  public getCooldown(): number {
    return this.config.stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction): void {
    const nearbyEnemies = this.getEntityManager().getNearbyEnemies(
      position,
      KNIFE_ATTACK_RANGE + 24,
      [...Zombies, Entities.FIRE]
    );

    const targetZombie = nearbyEnemies.find((entity) => {
      const zombiePos = entity.getExt(Positionable).getCenterPosition();
      const dx = zombiePos.x - position.x;
      const dy = zombiePos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const destructible = entity.getExt(Destructible);
      if (destructible.isDead()) return false;

      if (distance > KNIFE_ATTACK_RANGE) return false;

      if (facing === Direction.Right && dx < 0) return false;
      if (facing === Direction.Left && dx > 0) return false;
      if (facing === Direction.Up && dy > 0) return false;
      if (facing === Direction.Down && dy < 0) return false;

      return true;
    });

    if (targetZombie) {
      const destructible = targetZombie.getExt(Destructible);
      const wasAlive = !destructible.isDead();
      destructible.damage(this.config.stats.damage!);
      knockBack(this.getEntityManager(), targetZombie, facing, this.config.stats.pushDistance!);

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
