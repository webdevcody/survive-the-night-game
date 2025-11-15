import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { GunFiredEvent } from "@shared/events/server-sent/gun-fired-event";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import { consumeAmmo } from "./helpers";

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

    this.getEntityManager().getBroadcaster().broadcastEvent(new GunFiredEvent(playerId));
  }
}
