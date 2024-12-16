import { EntityManager } from "../../managers/entity-manager";
import { Entity, Entities, RawEntity } from "../entities";
import { Interactive, Positionable } from "../extensions";
import { Player } from "./player";

export const WEAPON_TYPES = {
  KNIFE: "Knife",
  SHOTGUN: "Shotgun",
  PISTOL: "Pistol",
} as const;

export type WeaponType = (typeof WEAPON_TYPES)[keyof typeof WEAPON_TYPES];

export class Weapon extends Entity {
  public static readonly Size = 16;
  private weaponType: WeaponType;

  public constructor(entityManager: EntityManager, weaponType: WeaponType) {
    super(entityManager, Entities.WEAPON);
    this.weaponType = weaponType;

    this.extensions = [
      new Positionable(this).setSize(Weapon.Size),
      new Interactive(this).onInteract(this.interact.bind(this)),
    ];
  }

  public interact(player: Player): void {
    if (player.isInventoryFull()) {
      return;
    }

    player.getInventory().push({ key: this.weaponType });
    this.getEntityManager().markEntityForRemoval(this);
  }

  public serialize(): RawEntity {
    return {
      ...this.baseSerialize(),
      weaponType: this.weaponType,
    };
  }
}
