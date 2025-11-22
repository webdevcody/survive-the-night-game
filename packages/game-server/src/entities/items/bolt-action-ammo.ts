import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class BoltActionAmmo extends StackableItem {
  public static readonly DEFAULT_AMMO_COUNT = 10;

  constructor(gameManagers: IGameManagers, itemState?: { count?: number }) {
    super(
      gameManagers,
      Entities.BOLT_ACTION_AMMO,
      "bolt_action_ammo",
      BoltActionAmmo.DEFAULT_AMMO_COUNT,
      "bolt action ammo",
      itemState
    );
  }

  protected getDefaultCount(): number {
    return BoltActionAmmo.DEFAULT_AMMO_COUNT;
  }
}
