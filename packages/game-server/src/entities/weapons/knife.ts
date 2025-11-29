import { IGameManagers } from "@/managers/types";
import { Direction } from "../../../../game-shared/src/util/direction";
import { Weapon } from "@/entities/weapons/weapon";
import Vector2 from "@/util/vector2";
import { performMeleeAttack } from "./helpers";
import { getConfig } from "@shared/config";

export class Knife extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "knife");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
  }

  public attack(playerId: number, position: Vector2, facing: Direction, aimAngle?: number): void {
    // Use game mode strategy to determine valid targets
    const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();

    performMeleeAttack({
      entityManager: this.getEntityManager(),
      gameManagers: this.getGameManagers(),
      attackerId: playerId,
      position,
      facing,
      aimAngle,
      attackRange: getConfig().combat.KNIFE_ATTACK_RANGE,
      damage: this.getConfig().stats.damage!,
      knockbackDistance: this.getConfig().stats.pushDistance,
      weaponKey: this.getType(),
      targetFilter: (entity, attackerId) => {
        return strategy.shouldDamageTarget(this, entity, attackerId);
      },
    });
  }
}
