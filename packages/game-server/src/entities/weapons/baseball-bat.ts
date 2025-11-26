import Destructible from "@/extensions/destructible";
import { IGameManagers } from "@/managers/types";
import { Direction, angleToDirection } from "../../../../game-shared/src/util/direction";
import { Weapon } from "@/entities/weapons/weapon";
import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import Vector2 from "@/util/vector2";
import Positionable from "@/extensions/positionable";
import { knockBack } from "./helpers";
import { Player } from "@/entities/players/player";
import { weaponRegistry } from "@shared/entities";
import { getConfig } from "@shared/config";

export class BaseballBat extends Weapon {
  private config = weaponRegistry.get("baseball_bat")!;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "baseball_bat");
  }

  public getCooldown(): number {
    return this.config.stats.cooldown;
  }

  public attack(playerId: number, position: Vector2, facing: Direction, aimAngle?: number): void {
    // Use aimAngle to determine attack direction if provided, otherwise use facing
    const attackDirection = aimAngle !== undefined ? angleToDirection(aimAngle) : facing;

    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      position,
      getConfig().combat.BASEBALL_BAT_ATTACK_RANGE + 24
    );

    // Use game mode strategy to determine valid targets
    const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
    const validTargets = nearbyEntities.filter(
      (entity) => entity.hasExt(Destructible) && strategy.shouldDamageTarget(this, entity, playerId)
    );

    const target = validTargets.find((entity) => {
      const targetPos = entity.getExt(Positionable).getCenterPosition();
      const dx = targetPos.x - position.x;
      const dy = targetPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const destructible = entity.getExt(Destructible);
      if (destructible.isDead()) return false;

      if (distance > getConfig().combat.BASEBALL_BAT_ATTACK_RANGE) return false;

      // Check if target is in the attack direction
      if (attackDirection === Direction.Right && dx < 0) return false;
      if (attackDirection === Direction.Left && dx > 0) return false;
      if (attackDirection === Direction.Up && dy > 0) return false;
      if (attackDirection === Direction.Down && dy < 0) return false;

      return true;
    });

    if (target) {
      const destructible = target.getExt(Destructible);
      const wasAlive = !destructible.isDead();

      destructible.damage(this.config.stats.damage!, playerId);

      knockBack(
        this.getEntityManager(),
        target,
        attackDirection,
        this.config.stats.pushDistance!
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
          weaponKey: "baseball_bat",
          attackDirection,
        })
      );
  }
}
