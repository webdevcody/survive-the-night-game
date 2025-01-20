import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class ShotgunAmmo extends StackableItem {
  public static readonly DEFAULT_AMMO_COUNT = 5;

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      Entities.SHOTGUN_AMMO,
      "shotgun_ammo",
      ShotgunAmmo.DEFAULT_AMMO_COUNT,
      "shotgun ammo"
    );
  }

  protected getDefaultCount(): number {
    return ShotgunAmmo.DEFAULT_AMMO_COUNT;
  }
}
