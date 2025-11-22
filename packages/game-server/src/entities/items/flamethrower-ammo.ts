import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class FlamethrowerAmmo extends StackableItem {
  public static readonly DEFAULT_AMMO_COUNT = 30;

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
