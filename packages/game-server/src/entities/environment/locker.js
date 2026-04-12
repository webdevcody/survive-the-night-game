import { Entities } from "@shared/constants";
import { InteractableTexts } from "@shared/util/interactable-text-encoding";
import { CraftingStation } from "./crafting-station";
export class Locker extends CraftingStation {
    constructor(gameManagers) {
        super(gameManagers, Entities.LOCKER, InteractableTexts.BANK);
    }
}
