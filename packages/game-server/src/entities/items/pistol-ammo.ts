import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";

export class PistolAmmo extends StackableItem {
  public static get DEFAULT_AMMO_COUNT(): number {
    return getConfig().ammo.PISTOL_AMMO_DEFAULT_COUNT;
  }

  constructor(gameManagers: IGameManagers, itemState?: { count?: number }) {
    super(
      gameManagers,
      Entities.PISTOL_AMMO,
      "pistol_ammo",
      PistolAmmo.DEFAULT_AMMO_COUNT,
      "pistol ammo",
      itemState
    );
  }

  protected getDefaultCount(): number {
    return PistolAmmo.DEFAULT_AMMO_COUNT;
  }
}
