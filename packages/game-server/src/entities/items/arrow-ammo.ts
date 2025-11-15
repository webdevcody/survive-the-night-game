import { IGameManagers } from "@/managers/types";
import { StackableItem } from "@/entities/items/stackable-item";

export class ArrowAmmo extends StackableItem {
  public static readonly DEFAULT_AMMO_COUNT = 16;

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

