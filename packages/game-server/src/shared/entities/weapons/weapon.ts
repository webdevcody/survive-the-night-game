import { IEntityManager, IGameManagers } from "../../../managers/types";
import { Entity } from "../../entity";
import Carryable from "../../extensions/carryable";
import Interactive from "../../extensions/interactive";
import Positionable from "../../extensions/positionable";
import { WeaponKey } from "../../inventory";
import { Direction } from "../../direction";

export const WEAPON_TYPES = {
  KNIFE: "knife",
  SHOTGUN: "shotgun",
  PISTOL: "pistol",
} as const;

export type WeaponType = (typeof WEAPON_TYPES)[keyof typeof WEAPON_TYPES];

export abstract class Weapon extends Entity {
  public static readonly Size = 16;

  constructor(gameManagers: IGameManagers, weaponKey: WeaponKey) {
    super(gameManagers, weaponKey);

    this.extensions = [
      new Positionable(this).setSize(Weapon.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName(weaponKey),
      new Carryable(this, weaponKey),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }

  public abstract attack(
    playerId: string,
    position: { x: number; y: number },
    facing: Direction
  ): void;
}
