import { PlayerAttackedEvent } from "@shared/events/server-sent/player-attacked-event";
import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { WEAPON_TYPES } from "@shared/types/weapons";
import { Direction } from "../../../../game-shared/src/util/direction";
import Vector2 from "@/util/vector2";
import { weaponRegistry } from "@shared/entities";

export class Shotgun extends Weapon {
  private config = weaponRegistry.get(WEAPON_TYPES.SHOTGUN)!;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, WEAPON_TYPES.SHOTGUN);
  }

  public getCooldown(): number {
    return this.config.stats.cooldown;
  }

  public attack(playerId: string, position: Vector2, facing: Direction): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);
    const ammoItem = inventory.getItems().find((item) => item.itemType === "shotgun_ammo");

    if (!ammoItem || !ammoItem.state?.count || ammoItem.state.count <= 0) {
      return; // No ammo available
    }

    // Consume ammo
    const ammoIndex = inventory.getItems().findIndex((item) => item.itemType === "shotgun_ammo");
    inventory.updateItemState(ammoIndex, { count: ammoItem.state.count - 1 });

    if (ammoItem.state.count <= 0) {
      inventory.removeItem(ammoIndex);
    }

    // Create 3 bullets with spread
    for (let i = -1; i <= 1; i++) {
      const bullet = new Bullet(this.getGameManagers());
      bullet.setPosition(position);
      bullet.setDirectionWithOffset(facing, i * this.config.stats.spreadAngle!);
      bullet.setShooterId(playerId);
      this.getEntityManager().addEntity(bullet);
    }

    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: WEAPON_TYPES.SHOTGUN,
        })
      );
  }
}
