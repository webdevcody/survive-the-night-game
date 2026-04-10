import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";
export class ArrowAmmo extends StackableItem {
    static get DEFAULT_AMMO_COUNT() {
        return getConfig().ammo.ARROW_AMMO_DEFAULT_COUNT;
    }
    constructor(gameManagers, itemState) {
        super(gameManagers, "arrow_ammo", "arrow_ammo", ArrowAmmo.DEFAULT_AMMO_COUNT, "arrow", itemState);
    }
    getDefaultCount() {
        return ArrowAmmo.DEFAULT_AMMO_COUNT;
    }
}
