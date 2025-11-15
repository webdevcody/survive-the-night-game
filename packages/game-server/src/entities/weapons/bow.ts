import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Arrow } from "@/entities/projectiles/arrow";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { GunFiredEvent } from "@shared/events/server-sent/gun-fired-event";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import { consumeAmmo } from "./helpers";

export class Bow extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "bow");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction, aimAngle?: number): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);

    if (!consumeAmmo(inventory, "arrow_ammo")) {
      this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(playerId));
      return;
    }

    const arrow = new Arrow(this.getGameManagers());
    arrow.setPosition(position);

    // Use aimAngle if provided (mouse aiming), otherwise use facing direction
    if (aimAngle !== undefined) {
      arrow.setDirectionFromAngle(aimAngle);
    } else {
      arrow.setDirection(facing);
    }

    arrow.setShooterId(playerId);
    this.getEntityManager().addEntity(arrow);

    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: this.getType(),
        })
      );

    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(new GunFiredEvent(playerId, this.getType()));
  }
}
