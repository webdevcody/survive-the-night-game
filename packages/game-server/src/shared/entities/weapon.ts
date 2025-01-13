import { IEntityManager } from "../../managers/types";
import { Entity } from "../entity";
import { Player } from "./player";
import Carryable from "../extensions/carryable";
import Interactive from "../extensions/interactive";
import Positionable from "../extensions/positionable";
import { Entities } from "@survive-the-night/game-shared/src/constants";
import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";

export const WEAPON_TYPES = {
  KNIFE: "knife",
  SHOTGUN: "shotgun",
  PISTOL: "pistol",
} as const;

export type WeaponType = (typeof WEAPON_TYPES)[keyof typeof WEAPON_TYPES];

export class Weapon extends Entity {
  public static readonly Size = 16;
  private weaponType: WeaponType;

  public constructor(entityManager: IEntityManager, weaponType: WeaponType) {
    super(entityManager, Entities.WEAPON);
    this.weaponType = weaponType;

    this.extensions = [
      new Positionable(this).setSize(Weapon.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName(weaponType),
      new Carryable(this, weaponType),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }

  public serialize(): RawEntity {
    return {
      ...super.serialize(),
      weaponType: this.weaponType,
    };
  }
}
