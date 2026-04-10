import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";
export class FlamethrowerAmmo extends StackableItem {
    static get DEFAULT_AMMO_COUNT() {
        return getConfig().ammo.FLAMETHROWER_AMMO_DEFAULT_COUNT;
    }
    constructor(gameManagers, itemState) {
        super(gameManagers, Entities.FLAMETHROWER_AMMO, "flamethrower_ammo", FlamethrowerAmmo.DEFAULT_AMMO_COUNT, "flamethrower ammo", itemState);
    }
    getDefaultCount() {
        return FlamethrowerAmmo.DEFAULT_AMMO_COUNT;
    }
}
