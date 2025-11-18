import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { GrenadeProjectile } from "@/entities/projectiles/grenade-projectile";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { PlayerAttackedEvent } from "@shared/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import { consumeAmmo } from "./helpers";

export class GrenadeLauncher extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "grenade_launcher");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction, aimAngle?: number): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);

    if (!consumeAmmo(inventory, "grenade_launcher_ammo")) {
      this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(playerId));
      return;
    }

    const grenadeProjectile = new GrenadeProjectile(this.getGameManagers());
    grenadeProjectile.setPosition(position);

    // Use aimAngle if provided (mouse aiming), otherwise use facing direction
    if (aimAngle !== undefined) {
      grenadeProjectile.setDirectionFromAngle(aimAngle);
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

