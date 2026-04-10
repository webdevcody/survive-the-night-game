import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
export class Wood extends StackableItem {
    constructor(gameManagers, itemState) {
        super(gameManagers, Entities.WOOD, "wood", 1, "wood", itemState);
    }
    getDefaultCount() {
        return 1;
    }
}
