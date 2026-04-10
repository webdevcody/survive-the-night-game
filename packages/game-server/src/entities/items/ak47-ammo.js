import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";
export class AK47Ammo extends StackableItem {
    static get DEFAULT_AMMO_COUNT() {
        return getConfig().ammo.AK47_AMMO_DEFAULT_COUNT;
    }
    constructor(gameManagers, itemState) {
        super(gameManagers, Entities.AK47_AMMO, "ak47_ammo", AK47Ammo.DEFAULT_AMMO_COUNT, "AK-47 ammo", itemState);
    }
    getDefaultCount() {
        return AK47Ammo.DEFAULT_AMMO_COUNT;
    }
}
