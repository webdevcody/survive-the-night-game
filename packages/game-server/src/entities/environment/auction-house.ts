import { Entities } from "@shared/constants";
import { InteractableTexts } from "@shared/util/interactable-text-encoding";
import type { IGameManagers } from "@/managers/types";
import { CraftingStation } from "./crafting-station";

export class AuctionHouse extends CraftingStation {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.AUCTION_HOUSE, InteractableTexts.AUCTION_HOUSE);
  }
}
