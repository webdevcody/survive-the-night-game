import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class GrenadeLauncherAmmo extends StackableItem {
  public static readonly DEFAULT_AMMO_COUNT = 10;

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      Entities.GRENADE_LAUNCHER_AMMO,
      "grenade_launcher_ammo",
      GrenadeLauncherAmmo.DEFAULT_AMMO_COUNT,
      "Grenade launcher ammo"
    );
  }

  protected getDefaultCount(): number {
    return GrenadeLauncherAmmo.DEFAULT_AMMO_COUNT;
  }
}

