import { Entities } from "@survive-the-night/game-shared";
import { RawEntity } from "@survive-the-night/game-shared";
import { EntityManager } from "../../managers/entity-manager";
import { Entity } from "../entity";
import { Interactive, Positionable, Carryable } from "../extensions";
import { Player } from "./player";

export const WEAPON_TYPES = {
  KNIFE: "knife",
  SHOTGUN: "shotgun",
  PISTOL: "pistol",
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
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName(weaponType),
      new Carryable(this, weaponType),
    ];
  }

  private interact(player: Player): void {
    this.getExt(Carryable).pickup(player);
  }

  public serialize(): RawEntity {
    return {
      ...this.baseSerialize(),
      weaponType: this.weaponType,
    };
  }
}
