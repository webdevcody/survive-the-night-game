import { PlayerAttackedEvent } from "@shared/events/server-sent/player-attacked-event";
import Inventory from "@/extensions/inventory";
import Movable from "@/extensions/movable";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction, normalizeDirection } from "../../../../game-shared/src/util/direction";
import Vector2 from "@/util/vector2";
import { consumeAmmo } from "./helpers";
import { GunEmptyEvent } from "@/events/server-sent/gun-empty-event";
import { normalizeVector } from "@shared/util/physics";
import type { IEntity } from "@/entities/types";

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
  /**
   * Applies recoil to the player when the shotgun is fired.
   * @param player - The player entity.
   * @param facing - The facing direction of the player.
   * @param aimAngle - The aim angle of the player.
   */
  private applyRecoil(player: IEntity, facing: Direction, aimAngle?: number) {
    const recoilStrength = this.getConfig().stats.recoilKnockback ?? 0;
    if (recoilStrength <= 0 || !player.hasExt(Movable)) {
      return;
    }

    let directionVector: Vector2;
    if (aimAngle !== undefined) {
      directionVector = new Vector2(Math.cos(aimAngle), Math.sin(aimAngle));
    } else {
      directionVector = normalizeDirection(facing);
    }

    const normalized = normalizeVector(directionVector);
    if (normalized.x === 0 && normalized.y === 0) {
      return;
    }

    const recoilVelocity = new Vector2(
      -normalized.x * recoilStrength,
      -normalized.y * recoilStrength
    );

    player.getExt(Movable).setVelocity(recoilVelocity);
  }
}
