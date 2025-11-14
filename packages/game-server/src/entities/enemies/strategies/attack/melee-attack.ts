import { BaseEnemy, AttackStrategy } from "../../base-enemy";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import Destructible from "@/extensions/destructible";
import Positionable from "@/extensions/positionable";
import { getConfig } from "@shared/config";
import { ZombieAttackedEvent } from "@/events/server-sent/zombie-attacked-event";
import { TargetingSystem } from "../targeting";
import { Entities } from "@/constants";

export class MeleeAttackStrategy implements AttackStrategy {
  onEntityDamaged?: (entity: IEntity) => void;

  /**
   * Calculate the shortest distance from a point to a rectangle (AABB)
   */
  private distanceToRect(point: Vector2, rectPos: Vector2, rectSize: Vector2): number {
    // Find the closest point on the rectangle to the given point
    const closestX = Math.max(rectPos.x, Math.min(point.x, rectPos.x + rectSize.x));
    const closestY = Math.max(rectPos.y, Math.min(point.y, rectPos.y + rectSize.y));

    // Calculate distance from point to closest point on rectangle
    const dx = point.x - closestX;
    const dy = point.y - closestY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  update(zombie: BaseEnemy, _deltaTime: number): void {
    if (!zombie.getAttackCooldown().isReady()) return;
    const zombieCenter = zombie.getCenterPosition();
    const attackRadius = getConfig().combat.ZOMBIE_ATTACK_RADIUS;

    // Get all nearby entities that can be attacked
    // Use a larger search radius to account for rectangular hitboxes
    const searchRadius = attackRadius + 20; // Add buffer for rectangular entities
    const attackableEntities = TargetingSystem.findNearbyAttackableEntities(zombie, searchRadius);

    // Find the closest entity to attack using rectangle-to-point distance
    let closestTarget = null;
    let closestDistance = Infinity;

    for (const target of attackableEntities) {
      const positionable = target.entity.getExt(Positionable);
      const entityPos = positionable.getPosition();
      const entitySize = positionable.getSize();

      // Use rectangle-to-point distance for better accuracy with rectangular hitboxes
      const distance = this.distanceToRect(zombieCenter, entityPos, entitySize);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestTarget = target;
      }
    }
    // Attack the closest entity if within range
    if (
      closestTarget &&
      closestTarget.entity.hasExt(Destructible) &&
      closestDistance <= getConfig().combat.ZOMBIE_ATTACK_RADIUS
    ) {
      closestTarget.entity.getExt(Destructible).damage(zombie.getAttackDamage());

      // Call the damage hook if provided
      if (this.onEntityDamaged) {
        this.onEntityDamaged(closestTarget.entity);
      }

      zombie
        .getGameManagers()
        .getBroadcaster()
        .broadcastEvent(new ZombieAttackedEvent(zombie.getId()));
      zombie.getAttackCooldown().reset();
    }
  }
}
