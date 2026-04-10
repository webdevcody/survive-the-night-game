import { Entities } from "@/constants";
import { StackableItem } from "@/entities/items/stackable-item";
import { getConfig } from "@shared/config";
export class BoltActionAmmo extends StackableItem {
    static get DEFAULT_AMMO_COUNT() {
        return getConfig().ammo.BOLT_ACTION_AMMO_DEFAULT_COUNT;
    }
    constructor(gameManagers, itemState) {
        super(gameManagers, Entities.BOLT_ACTION_AMMO, "bolt_action_ammo", BoltActionAmmo.DEFAULT_AMMO_COUNT, "bolt action ammo", itemState);
    }
    getDefaultCount() {
        return BoltActionAmmo.DEFAULT_AMMO_COUNT;
    }
}
