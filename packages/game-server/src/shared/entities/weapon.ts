import { EntityManager } from "../../managers/entity-manager";
import { Entity, Entities, RawEntity } from "../entities";
import { Vector2 } from "../physics";
import { Harvestable, Positionable } from "../traits";
import { Player } from "./player";

export const WEAPON_TYPES = {
  KNIFE: "Knife",
  SHOTGUN: "Shotgun",
  PISTOL: "Pistol",
} as const;
export type WeaponType = (typeof WEAPON_TYPES)[keyof typeof WEAPON_TYPES];

export class Weapon extends Entity implements Harvestable, Positionable {
  private weaponType: WeaponType;
  private position: Vector2 = { x: 0, y: 0 };

  public constructor(entityManager: EntityManager, weaponType: WeaponType) {
    super(entityManager, Entities.WEAPON);
    this.weaponType = weaponType;
  }

  public harvest(player: Player): void {
    if (player.isInventoryFull() || player.hasInInventory(this.weaponType)) {
      return;
    }

    player.getInventory().push({
      key: this.weaponType,
    });

    this.getEntityManager().markEntityForRemoval(this);
  }

  public serialize(): RawEntity {
    return {
      ...super.serialize(),
      weaponType: this.weaponType,
      position: this.position,
    };
  }

  public getPosition(): Vector2 {
    return this.position;
  }

  public setPosition(position: Vector2) {
    this.position = position;
  }

  public getCenterPosition(): Vector2 {
    return this.position;
  }
}
