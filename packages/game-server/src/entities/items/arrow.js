import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
export class Arrow extends StackableItem {
    constructor(gameManagers, itemState) {
        super(gameManagers, Entities.ARROW, "arrow", Arrow.DEFAULT_ARROW_COUNT, "arrow", itemState);
    }
    getDefaultCount() {
        return Arrow.DEFAULT_ARROW_COUNT;
    }
}
Arrow.DEFAULT_ARROW_COUNT = 10;
