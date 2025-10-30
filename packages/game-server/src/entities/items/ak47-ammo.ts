import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class AK47Ammo extends StackableItem {
  public static readonly DEFAULT_AMMO_COUNT = 30;

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      Entities.AK47_AMMO,
      "ak47_ammo",
      AK47Ammo.DEFAULT_AMMO_COUNT,
      "AK-47 ammo"
    );
  }

  protected getDefaultCount(): number {
    return AK47Ammo.DEFAULT_AMMO_COUNT;
  }
}
