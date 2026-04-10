import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { AIStateHandler, AIStateContext } from "./base-state";
/**
 * ENGAGE state handler - combat with any enemy (zombie or player)
 */
export declare class EngageStateHandler implements AIStateHandler {
    handle(input: Input, playerPos: Vector2, context: AIStateContext): void;
    /**
     * Handle ranged combat - shoot from distance
     */
    private handleRangedCombat;
    /**
     * Handle melee combat with kiting
     */
    private handleMeleeCombat;
    /**
     * Handle escape behavior - flee completely when very low health
     */
    private handleEscapeBehavior;
    /**
     * Handle disengage behavior - run away to gather supplies
     */
    private handleDisengageBehavior;
    /**
     * Handle kiting retreat - move away while still fighting
     */
    private handleKitingRetreat;
}
