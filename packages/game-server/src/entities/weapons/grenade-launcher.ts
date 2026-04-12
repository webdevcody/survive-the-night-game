import { IGameManagers } from "@/managers/types";
import { GrenadeProjectile } from "@/entities/projectiles/grenade-projectile";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import Vector2 from "@/util/vector2";
import { Player } from "@/entities/players/player";
import { getJitteredFireAngleRadians } from "@/entities/weapons/weapon-accuracy";

export class GrenadeLauncher extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "grenade_launcher");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
  }

  public attack(playerId: number, position: Vector2, facing: Direction, aimAngle?: number, aimDistance?: number): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const grenadeProjectile = new GrenadeProjectile(this.getGameManagers());
    grenadeProjectile.setPosition(position);

    // Set target distance if provided (mouse aiming), grenade will explode at crosshair position
    if (aimDistance !== undefined && !isNaN(aimDistance)) {
      grenadeProjectile.setTargetDistance(aimDistance);
    }

    let fireAngle: number | undefined;
    if (player instanceof Player) {
      fireAngle = getJitteredFireAngleRadians(player, aimAngle, facing, 0.08);
    } else if (aimAngle !== undefined) {
      fireAngle = aimAngle;
    }
    if (fireAngle !== undefined) {
      grenadeProjectile.setDirectionFromAngle(fireAngle);
    } else {
      grenadeProjectile.setDirection(facing);
    }

    grenadeProjectile.setShooterId(playerId);
    this.getEntityManager().addEntity(grenadeProjectile);

    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: this.getType(),
        })
      );
  }
}
