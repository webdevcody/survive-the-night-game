import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";

export class AK47Ammo extends StackableItem {
  public static get DEFAULT_AMMO_COUNT(): number {
    return getConfig().ammo.AK47_AMMO_DEFAULT_COUNT;
  }

  constructor(gameManagers: IGameManagers, itemState?: { count?: number }) {
    super(
      gameManagers,
      Entities.AK47_AMMO,
      "ak47_ammo",
      AK47Ammo.DEFAULT_AMMO_COUNT,
      "AK-47 ammo",
      itemState
    );
  }

  protected getDefaultCount(): number {
    return AK47Ammo.DEFAULT_AMMO_COUNT;
  }
}
