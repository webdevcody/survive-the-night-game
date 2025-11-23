import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class GrenadeLauncherAmmo extends StackableItem {
  public static readonly DEFAULT_AMMO_COUNT = 4;

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
