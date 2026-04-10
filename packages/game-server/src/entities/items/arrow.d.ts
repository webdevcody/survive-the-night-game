import { IGameManagers } from "@/managers/types";
import { StackableItem } from "@/entities/items/stackable-item";
export declare class Arrow extends StackableItem {
    static readonly DEFAULT_ARROW_COUNT = 10;
    constructor(gameManagers: IGameManagers, itemState?: {
        count?: number;
    });
    protected getDefaultCount(): number;
}
