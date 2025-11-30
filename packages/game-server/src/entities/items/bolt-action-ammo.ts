import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";

export class BoltActionAmmo extends StackableItem {
  public static get DEFAULT_AMMO_COUNT(): number {
    return getConfig().ammo.BOLT_ACTION_AMMO_DEFAULT_COUNT;
  }

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
