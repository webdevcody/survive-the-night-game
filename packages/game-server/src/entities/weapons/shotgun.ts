import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import Vector2 from "@/util/vector2";
import { consumeAmmo } from "./helpers";
import { GunEmptyEvent } from "../../../../game-shared/src/events/server-sent/events/gun-empty-event";

export class Shotgun extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "shotgun");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
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
        const spreadRadians = (i * this.getConfig().stats.spreadAngle! * Math.PI) / 180;
        bullet.setDirectionFromAngle(aimAngle + spreadRadians);
      } else {
        bullet.setDirectionWithOffset(facing, i * this.getConfig().stats.spreadAngle!);
      }

      bullet.setShooterId(playerId);
      this.getEntityManager().addEntity(bullet);
    }

    this.applyRecoil(player, facing, aimAngle);

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
