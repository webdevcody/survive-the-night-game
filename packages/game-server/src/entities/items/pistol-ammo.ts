import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class PistolAmmo extends StackableItem {
  public static readonly DEFAULT_AMMO_COUNT = 16;

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
