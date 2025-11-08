import { PlayerAttackedEvent } from "@shared/events/server-sent/player-attacked-event";
import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { WEAPON_TYPES } from "@shared/types/weapons";
import { Direction } from "../../../../game-shared/src/util/direction";
import Vector2 from "@/util/vector2";
import { weaponRegistry } from "@shared/entities";
import { consumeAmmo } from "./helpers";
import { GunEmptyEvent } from "@/events/server-sent/gun-empty-event";

export class Shotgun extends Weapon {
  private config = weaponRegistry.get(WEAPON_TYPES.SHOTGUN)!;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, WEAPON_TYPES.SHOTGUN);
  }

  public getCooldown(): number {
    return this.config.stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction, aimAngle?: number): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);

    if (!consumeAmmo(inventory, "shotgun_ammo")) {
      this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(playerId));
      return; // No ammo available
    }

    // Create 3 bullets with spread
    for (let i = -1; i <= 1; i++) {
      const bullet = new Bullet(this.getGameManagers());
      bullet.setPosition(position);

      // Use aimAngle if provided (mouse aiming), otherwise use facing direction
      if (aimAngle !== undefined) {
        // Convert spread angle to radians and apply offset
        const spreadRadians = (i * this.config.stats.spreadAngle! * Math.PI) / 180;
        bullet.setDirectionFromAngle(aimAngle + spreadRadians);
      } else {
        bullet.setDirectionWithOffset(facing, i * this.config.stats.spreadAngle!);
      }

      bullet.setShooterId(playerId);
      this.getEntityManager().addEntity(bullet);
    }

    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: WEAPON_TYPES.SHOTGUN,
        })
      );
  }
}
