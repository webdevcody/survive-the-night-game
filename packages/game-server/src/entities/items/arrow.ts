import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";

export class Arrow extends StackableItem {
  public static readonly DEFAULT_ARROW_COUNT = 10;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.ARROW, "arrow", Arrow.DEFAULT_ARROW_COUNT, "arrow");
  }

  protected getDefaultCount(): number {
    return Arrow.DEFAULT_ARROW_COUNT;
  }
}
