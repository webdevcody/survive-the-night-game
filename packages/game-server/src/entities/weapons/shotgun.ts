import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import Vector2 from "@/util/vector2";
import { consumeAmmo } from "./helpers";
import { GunEmptyEvent } from "../../../../game-shared/src/events/server-sent/events/gun-empty-event";
import { Player } from "@/entities/players/player";
import { normalizeDirection } from "@shared/util/direction";

export class Shotgun extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "shotgun");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
  }

  public attack(playerId: number, position: Vector2, facing: Direction, aimAngle?: number): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);

    if (!consumeAmmo(inventory, "shotgun_ammo")) {
      this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(playerId));
      return; // No ammo available
    }

    const spreadMult = player instanceof Player ? player.getAccuracySpreadMultiplier() : 1;
    const spreadDeg = this.getConfig().stats.spreadAngle!;
    const v = normalizeDirection(facing);
    const baseAngle =
      aimAngle !== undefined ? aimAngle : Math.atan2(v.y, v.x);

    for (let i = -1; i <= 1; i++) {
      const bullet = new Bullet(this.getGameManagers());
      bullet.setPosition(position);

      const spreadRadians = ((i * spreadDeg * spreadMult) * Math.PI) / 180;
      const jitter =
        player instanceof Player ? (Math.random() - 0.5) * 0.06 * spreadMult : 0;
      bullet.setDirectionFromAngle(baseAngle + spreadRadians + jitter);

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
