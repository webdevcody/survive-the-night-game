import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";

export class FlamethrowerAmmo extends StackableItem {
  public static get DEFAULT_AMMO_COUNT(): number {
    return getConfig().ammo.FLAMETHROWER_AMMO_DEFAULT_COUNT;
  }

  constructor(gameManagers: IGameManagers, itemState?: { count?: number }) {
    super(
      gameManagers,
      Entities.FLAMETHROWER_AMMO,
      "flamethrower_ammo",
      FlamethrowerAmmo.DEFAULT_AMMO_COUNT,
      "flamethrower ammo",
      itemState
    );
  }

  protected getDefaultCount(): number {
    return FlamethrowerAmmo.DEFAULT_AMMO_COUNT;
  }
}
