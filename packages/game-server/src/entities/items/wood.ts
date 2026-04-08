import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class Wood extends StackableItem {
  constructor(gameManagers: IGameManagers, itemState?: { count?: number }) {
    super(gameManagers, Entities.WOOD, "wood", 1, "wood", itemState);
  }

  protected getDefaultCount(): number {
    return 1;
  }
}
