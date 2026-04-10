import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { AIStateHandler, AIStateContext } from "./base-state";
/**
 * RETREAT state handler - flee and heal
 */
export declare class RetreatStateHandler implements AIStateHandler {
    handle(input: Input, playerPos: Vector2, context: AIStateContext): void;
    /**
     * Try to equip and use a bandage if player needs healing
     */
    private tryUseBandage;
    /**
     * Find a random walkable direction and set movement
     * ALWAYS uses A* pathfinding - never direct movement
     */
    private findRandomWalkableDirection;
}
