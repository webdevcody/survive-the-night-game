import Destructible from "@/extensions/destructible";
import { IGameManagers } from "@/managers/types";
import { Direction, angleToDirection } from "../../../../game-shared/src/util/direction";
import { Weapon } from "@/entities/weapons/weapon";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import Positionable from "@/extensions/positionable";
import Groupable from "@/extensions/groupable";
import { knockBack } from "./helpers";
import { Player } from "@/entities/player";
import { getConfig } from "@shared/config";

export class Knife extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "knife");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction, aimAngle?: number): void {
    // Use aimAngle to determine attack direction if provided, otherwise use facing
    const attackDirection = aimAngle !== undefined ? angleToDirection(aimAngle) : facing;

    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      position,
      getConfig().combat.KNIFE_ATTACK_RANGE + 24
    );
    const nearbyEnemies = nearbyEntities.filter(
      (entity) => entity.hasExt(Groupable) && entity.getExt(Groupable).getGroup() === "enemy"
    );

    const targetZombie = nearbyEnemies.find((entity) => {
      const zombiePos = entity.getExt(Positionable).getCenterPosition();
      const dx = zombiePos.x - position.x;
      const dy = zombiePos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const destructible = entity.getExt(Destructible);
      if (destructible.isDead()) return false;

      if (distance > getConfig().combat.KNIFE_ATTACK_RANGE) return false;

      // Check if enemy is in the attack direction
      if (attackDirection === Direction.Right && dx < 0) return false;
      if (attackDirection === Direction.Left && dx > 0) return false;
      if (attackDirection === Direction.Up && dy > 0) return false;
      if (attackDirection === Direction.Down && dy < 0) return false;

      return true;
    });

    if (targetZombie) {
      const destructible = targetZombie.getExt(Destructible);
      const wasAlive = !destructible.isDead();
      destructible.damage(this.getConfig().stats.damage!);
      knockBack(
        this.getEntityManager(),
        targetZombie,
        attackDirection,
        this.getConfig().stats.pushDistance!
      );

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
          weaponKey: this.getType(),
          attackDirection,
        })
      );
  }
}
