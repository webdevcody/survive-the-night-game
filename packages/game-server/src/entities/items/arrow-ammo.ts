import { IGameManagers } from "@/managers/types";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";

export class ArrowAmmo extends StackableItem {
  public static get DEFAULT_AMMO_COUNT(): number {
    return getConfig().ammo.ARROW_AMMO_DEFAULT_COUNT;
  }

  constructor(gameManagers: IGameManagers, itemState?: { count?: number }) {
    super(
      gameManagers,
      "arrow_ammo",
      "arrow_ammo",
      ArrowAmmo.DEFAULT_AMMO_COUNT,
      "arrow",
      itemState
    );
  }

  protected getDefaultCount(): number {
    return ArrowAmmo.DEFAULT_AMMO_COUNT;
  }
}

