import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";

export class ShotgunAmmo extends StackableItem {
  public static get DEFAULT_AMMO_COUNT(): number {
    return getConfig().ammo.SHOTGUN_AMMO_DEFAULT_COUNT;
  }

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
