import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { FlameProjectile } from "@/entities/projectiles/flame-projectile";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { PlayerAttackedEvent } from "@shared/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import { consumeAmmo } from "./helpers";

export class Flamethrower extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "flamethrower");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction, aimAngle?: number): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);

    if (!consumeAmmo(inventory, "flamethrower_ammo")) {
      this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(playerId));
      return;
    }

    // Create flame projectile with damage
    const flame = new FlameProjectile(this.getGameManagers(), 1);
    flame.setPosition(position);

    // Use aimAngle if provided (mouse aiming), otherwise use facing direction
    if (aimAngle !== undefined) {
      flame.setDirectionFromAngle(aimAngle);
    } else {
      flame.setDirection(facing);
    }

    flame.setShooterId(playerId);
    this.getEntityManager().addEntity(flame);

    // Broadcast attack event
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
