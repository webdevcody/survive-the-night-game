import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { WeaponKey } from "../../../../game-shared/src/util/inventory";
import { Direction } from "../../../../game-shared/src/util/direction";
import Vector2 from "@/util/vector2";
import { WeaponConfig, weaponRegistry } from "@shared/entities";
import type { IEntity } from "@/entities/types";
import { applyWeaponRecoil } from "@/entities/util/recoil";

export abstract class Weapon extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers, weaponKey: WeaponKey) {
    super(gameManagers, weaponKey);

    this.addExtension(new Positionable(this).setSize(Weapon.Size));
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName(weaponKey)
    );
    this.addExtension(new Carryable(this, weaponKey));
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }

  public getConfig(): WeaponConfig {
    return weaponRegistry.get(this.getType())!;
  }

  public abstract attack(
    playerId: string,
    position: { x: number; y: number },
    facing: Direction,
    aimAngle?: number
  ): void;

  public abstract getCooldown(): number;

  protected applyRecoil(
    player: IEntity,
    facing: Direction,
    aimAngle: number | undefined,
    strengthScale: number = 1
  ): void {
    const recoilBase = this.getConfig().stats.recoilKnockback ?? 0;
    const recoilStrength = recoilBase * strengthScale;
    applyWeaponRecoil({
      player,
      facing,
      aimAngle,
      strength: recoilStrength,
    });
  }
}
