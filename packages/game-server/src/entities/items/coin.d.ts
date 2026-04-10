import { IGameManagers } from "@/managers/types";
import { StackableItem } from "@/entities/items/stackable-item";
export declare class Coin extends StackableItem {
    constructor(gameManagers: IGameManagers, itemState?: {
        count?: number;
    });
    protected getDefaultCount(): number;
    protected interact(entityId: number): void;
}
