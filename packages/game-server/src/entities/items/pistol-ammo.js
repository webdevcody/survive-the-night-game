import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";
export class PistolAmmo extends StackableItem {
    static get DEFAULT_AMMO_COUNT() {
        return getConfig().ammo.PISTOL_AMMO_DEFAULT_COUNT;
    }
    constructor(gameManagers, itemState) {
        super(gameManagers, Entities.PISTOL_AMMO, "pistol_ammo", PistolAmmo.DEFAULT_AMMO_COUNT, "pistol ammo", itemState);
    }
    getDefaultCount() {
        return PistolAmmo.DEFAULT_AMMO_COUNT;
    }
}
