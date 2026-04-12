import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { GunFiredEvent } from "../../../../game-shared/src/events/server-sent/events/gun-fired-event";
import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import Vector2 from "@/util/vector2";
import { Player } from "@/entities/players/player";
import { Entity } from "@/entities/entity";
import { getJitteredFireAngleRadians } from "@/entities/weapons/weapon-accuracy";

export class Pistol extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "pistol");
  }

  public getCooldown(): number {
    return this.getConfig().stats.cooldown;
  }

  public attack(playerId: number, position: Vector2, facing: Direction, aimAngle?: number): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const bullet = new Bullet(this.getGameManagers());
    bullet.setPosition(position);

    let fireAngle: number | undefined;
    if (player instanceof Player) {
      fireAngle = getJitteredFireAngleRadians(player, aimAngle, facing, 0.14);
    } else if (aimAngle !== undefined) {
      fireAngle = aimAngle;
    }
    if (fireAngle !== undefined) {
      bullet.setDirectionFromAngle(fireAngle);
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

    this.applyRecoil(player as unknown as Entity, facing, aimAngle, 0.35);
    this.getEntityManager().getBroadcaster().broadcastEvent(new GunFiredEvent(playerId, "pistol"));
  }
}
