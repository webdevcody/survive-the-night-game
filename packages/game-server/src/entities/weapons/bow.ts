import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Arrow } from "@/entities/projectiles/arrow";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { GunEmptyEvent } from "../../../../game-shared/src/events/server-sent/events/gun-empty-event";
import { GunFiredEvent } from "../../../../game-shared/src/events/server-sent/events/gun-fired-event";
import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import Vector2 from "@/util/vector2";
import { consumeAmmo } from "./helpers";
import { Player } from "@/entities/players/player";
import { getJitteredFireAngleRadians } from "@/entities/weapons/weapon-accuracy";

export class Bow extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "bow");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
  }

  public attack(playerId: number, position: Vector2, facing: Direction, aimAngle?: number): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);

    if (!consumeAmmo(inventory, "arrow_ammo")) {
      this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(playerId));
      return;
    }

    const arrow = new Arrow(this.getGameManagers());
    arrow.setPosition(position);

    let fireAngle: number | undefined;
    if (player instanceof Player) {
      fireAngle = getJitteredFireAngleRadians(player, aimAngle, facing, 0.11);
    } else if (aimAngle !== undefined) {
      fireAngle = aimAngle;
    }
    if (fireAngle !== undefined) {
      arrow.setDirectionFromAngle(fireAngle);
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
