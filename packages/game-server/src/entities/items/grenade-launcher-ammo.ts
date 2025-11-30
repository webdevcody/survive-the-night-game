import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";

export class GrenadeLauncherAmmo extends StackableItem {
  public static get DEFAULT_AMMO_COUNT(): number {
    return getConfig().ammo.GRENADE_LAUNCHER_AMMO_DEFAULT_COUNT;
  }

  constructor(gameManagers: IGameManagers, itemState?: { count?: number }) {
    super(
      gameManagers,
      Entities.GRENADE_LAUNCHER_AMMO,
      "grenade_launcher_ammo",
      GrenadeLauncherAmmo.DEFAULT_AMMO_COUNT,
      "Grenade launcher ammo",
      itemState
    );
  }

  protected getDefaultCount(): number {
    return GrenadeLauncherAmmo.DEFAULT_AMMO_COUNT;
  }
}
