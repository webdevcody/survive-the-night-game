import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";
export class GrenadeLauncherAmmo extends StackableItem {
    static get DEFAULT_AMMO_COUNT() {
        return getConfig().ammo.GRENADE_LAUNCHER_AMMO_DEFAULT_COUNT;
    }
    constructor(gameManagers, itemState) {
        super(gameManagers, Entities.GRENADE_LAUNCHER_AMMO, "grenade_launcher_ammo", GrenadeLauncherAmmo.DEFAULT_AMMO_COUNT, "Grenade launcher ammo", itemState);
    }
    getDefaultCount() {
        return GrenadeLauncherAmmo.DEFAULT_AMMO_COUNT;
    }
}
