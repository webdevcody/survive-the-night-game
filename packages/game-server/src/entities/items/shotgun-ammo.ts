import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class ShotgunAmmo extends StackableItem {
  public static readonly DEFAULT_AMMO_COUNT = 8;

  constructor(gameManagers: IGameManagers, itemState?: { count?: number }) {
    super(
      gameManagers,
      Entities.SHOTGUN_AMMO,
      "shotgun_ammo",
      ShotgunAmmo.DEFAULT_AMMO_COUNT,
      "shotgun ammo",
      itemState
    );
  }

  protected getDefaultCount(): number {
    return ShotgunAmmo.DEFAULT_AMMO_COUNT;
  }
}
