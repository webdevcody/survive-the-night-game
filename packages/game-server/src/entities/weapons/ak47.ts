import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { GunEmptyEvent } from "../../../../game-shared/src/events/server-sent/events/gun-empty-event";
import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import Vector2 from "@/util/vector2";
import { consumeAmmo } from "./helpers";

export class AK47 extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "ak47");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction, aimAngle?: number): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);

    if (!consumeAmmo(inventory, "ak47_ammo")) {
      this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(playerId));
      return;
    }

    const bullet = new Bullet(this.getGameManagers(), 1);
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
  }
}
