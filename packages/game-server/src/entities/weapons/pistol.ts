import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import { WEAPON_TYPES } from "@shared/types/weapons";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { PlayerAttackedEvent } from "@/events/server-sent/player-attacked-event";

export class Pistol extends Weapon {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, WEAPON_TYPES.PISTOL);
  }

  public attack(playerId: string, position: { x: number; y: number }, facing: Direction): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player) return;

    const inventory = player.getExt(Inventory);
    const ammoItem = inventory.getItems().find((item) => item.key === "pistol_ammo");

    console.log("ammoItem", ammoItem);
    if (!ammoItem || !ammoItem.state?.count || ammoItem.state.count <= 0) {
      this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(playerId));
      return; // No ammo available
    }

    // Consume ammo
    const ammoIndex = inventory.getItems().findIndex((item) => item.key === "pistol_ammo");
    inventory.updateItemState(ammoIndex, { count: ammoItem.state.count - 1 });

    const bullet = new Bullet(this.getGameManagers());
    bullet.setPosition(position);
    bullet.setDirection(facing);
    this.getEntityManager().addEntity(bullet);

    this.getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerAttackedEvent({
          playerId,
          weaponKey: WEAPON_TYPES.PISTOL,
        })
      );
  }
}
