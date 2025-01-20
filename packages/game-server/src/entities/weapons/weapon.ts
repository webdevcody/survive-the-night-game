import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { WeaponKey } from "../../../../game-shared/src/util/inventory";
import { Direction } from "../../../../game-shared/src/util/direction";
import Vector2 from "@/util/vector2";

export abstract class Weapon extends Entity {
  public static readonly Size = new Vector2(16, 16);

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

  public abstract getCooldown(): number;
}
