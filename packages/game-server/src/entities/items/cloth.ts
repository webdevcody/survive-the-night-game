import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class Cloth extends StackableItem {
  constructor(gameManagers: IGameManagers, itemState?: { count?: number }) {
    super(gameManagers, Entities.CLOTH, "cloth", 1, "cloth", itemState);
  }

  protected getDefaultCount(): number {
    return 1;
  }
}
