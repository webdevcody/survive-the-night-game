import Inventory from "@/extensions/inventory";
import Movable from "@/extensions/movable";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction, normalizeDirection } from "../../../../game-shared/src/util/direction";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { GunFiredEvent } from "@shared/events/server-sent/gun-fired-event";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import { consumeAmmo } from "./helpers";
import { normalizeVector } from "@shared/util/physics";
import type { IEntity } from "@/entities/types";

export class Pistol extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "pistol");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction, aimAngle?: number): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);

    if (!consumeAmmo(inventory, "pistol_ammo")) {
      this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(playerId));
      return;
    }

    const bullet = new Bullet(this.getGameManagers());
    bullet.setPosition(position);

    // Use aimAngle if provided (mouse aiming), otherwise use facing direction
    if (aimAngle !== undefined) {
      bullet.setDirectionFromAngle(aimAngle);
    } else {
      bullet.setDirection(facing);
    }

    bullet.setShooterId(playerId);
    this.getEntityManager().addEntity(bullet);

    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: this.getType(),
        })
      );

    this.applyRecoil(player, facing, aimAngle);
    this.getEntityManager().getBroadcaster().broadcastEvent(new GunFiredEvent(playerId));
  }

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
      -normalized.x * (recoilStrength * 0.35),
      -normalized.y * (recoilStrength * 0.35)
    );

    player.getExt(Movable).setVelocity(recoilVelocity);
  }
}
