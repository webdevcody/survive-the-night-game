import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";
export class ShotgunAmmo extends StackableItem {
    static get DEFAULT_AMMO_COUNT() {
        return getConfig().ammo.SHOTGUN_AMMO_DEFAULT_COUNT;
    }
    constructor(gameManagers, itemState) {
        super(gameManagers, Entities.SHOTGUN_AMMO, "shotgun_ammo", ShotgunAmmo.DEFAULT_AMMO_COUNT, "shotgun ammo", itemState);
    }
    getDefaultCount() {
        return ShotgunAmmo.DEFAULT_AMMO_COUNT;
    }
}
