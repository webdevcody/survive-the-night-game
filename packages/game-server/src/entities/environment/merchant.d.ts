import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { type MerchantShopItem } from "@shared/config";
export declare class Merchant extends Entity {
    static get Size(): Vector2;
    constructor(gameManagers: IGameManagers);
    private interact;
    /**
     * Initialize shop items with all buyable items (no randomization)
     */
    initializeShopItems(): void;
    getShopItems(): MerchantShopItem[];
    setPosition(position: Vector2): void;
}
