import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
export class Cloth extends StackableItem {
    constructor(gameManagers, itemState) {
        super(gameManagers, Entities.CLOTH, "cloth", 1, "cloth", itemState);
    }
    getDefaultCount() {
        return 1;
    }
}
