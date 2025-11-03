import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { FlameProjectile } from "@/entities/projectiles/flame-projectile";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { WEAPON_TYPES } from "@shared/types/weapons";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";
import Vector2 from "@/util/vector2";
import { weaponRegistry } from "@shared/entities";
import { consumeAmmo } from "./helpers";

export class Flamethrower extends Weapon {
  private config = weaponRegistry.get(WEAPON_TYPES.FLAMETHROWER)!;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, WEAPON_TYPES.FLAMETHROWER);
  }

  public getCooldown(): number {
    return this.config.stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction): void {
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
    flame.setDirection(facing);
    flame.setShooterId(playerId);
    this.getEntityManager().addEntity(flame);

    // Broadcast attack event
    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: WEAPON_TYPES.FLAMETHROWER,
        })
      );
  }
}
