import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { WEAPON_TYPES } from "@shared/types/weapons";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import { weaponRegistry } from "@shared/entities";
import { consumeAmmo } from "./helpers";

export class AK47 extends Weapon {
  private config = weaponRegistry.get(WEAPON_TYPES.AK47)!;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, WEAPON_TYPES.AK47);
  }

  public getCooldown(): number {
    return this.config.stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);

    if (!consumeAmmo(inventory, "ak47_ammo")) {
      this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(playerId));
      return;
    }

    const bullet = new Bullet(this.getGameManagers(), 2);
    bullet.setPosition(position);
    bullet.setDirection(facing);
    bullet.setShooterId(playerId);
    this.getEntityManager().addEntity(bullet);

    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: WEAPON_TYPES.AK47,
        })
      );
  }
}
