import { IGameManagers } from "@/managers/types";
import { StackableItem } from "@/entities/items/stackable-item";
export declare class GrenadeLauncherAmmo extends StackableItem {
    static get DEFAULT_AMMO_COUNT(): number;
    constructor(gameManagers: IGameManagers, itemState?: {
        count?: number;
    });
    protected getDefaultCount(): number;
}
