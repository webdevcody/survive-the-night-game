import { Player } from "@/entities/players/player";
import { IEntity } from "@/entities/types";
import { AITargetingSystem } from "./ai-targeting";
/**
 * Result of an interaction attempt
 */
export interface InteractionResult {
    success: boolean;
    reason?: "entity_invalid" | "no_interactive" | "inventory_full" | "cannot_stack";
}
/**
 * AI Interaction Helper - Centralized logic for AI item interactions
 * Handles inventory checks, debug logging, and interaction execution
 */
export declare class AIInteractionHelper {
    /**
     * Attempt to pick up an item entity
     * Checks if entity is valid, has Interactive extension, and if inventory can hold the item
     *
     * @param player - The AI player
     * @param entity - The item entity to pick up
     * @param targetingSystem - The targeting system for inventory checks
     * @param stateName - Optional state name for debug logging (e.g., "LOOT", "RETREAT")
     * @returns InteractionResult indicating success or failure reason
     */
    static tryPickupItem(player: Player, entity: IEntity | undefined, targetingSystem: AITargetingSystem, stateName?: string): InteractionResult;
    /**
     * Attempt to interact with a barrel/container entity
     * Does not check inventory (barrels scatter items, not direct pickup)
     *
     * @param player - The AI player
     * @param entity - The barrel entity to interact with
     * @returns InteractionResult indicating success or failure reason
     */
    static tryInteractWithBarrel(player: Player, entity: IEntity | undefined): InteractionResult;
    /**
     * Check if an item pickup is possible without performing it
     * Useful for deciding whether to target an item
     *
     * @param player - The AI player
     * @param entity - The item entity to check
     * @param targetingSystem - The targeting system for inventory checks
     * @returns true if pickup would succeed, false otherwise
     */
    static canPickupItem(player: Player, entity: IEntity | undefined, targetingSystem: AITargetingSystem): boolean;
    /**
     * Format inventory for debug logging
     */
    private static formatInventory;
}
