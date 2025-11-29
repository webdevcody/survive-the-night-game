import { Player } from "@/entities/players/player";
import { IEntity } from "@/entities/types";
import Interactive from "@/extensions/interactive";
import Carryable from "@/extensions/carryable";
import { AITargetingSystem } from "./ai-targeting";
import { InventoryItem } from "@/util/inventory";

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
export class AIInteractionHelper {
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
  static tryPickupItem(
    player: Player,
    entity: IEntity | undefined,
    targetingSystem: AITargetingSystem,
    stateName?: string
  ): InteractionResult {
    // Check if entity exists and is not marked for removal
    if (!entity || entity.isMarkedForRemoval()) {
      return { success: false, reason: "entity_invalid" };
    }

    // Check if entity has Interactive extension
    if (!entity.hasExt(Interactive)) {
      return { success: false, reason: "no_interactive" };
    }

    const inventory = player.getInventory();

    // Check if inventory is full
    if (targetingSystem.isInventoryFull(inventory)) {
      // Get item type to check if we can stack it
      const itemType = entity.hasExt(Carryable)
        ? entity.getExt(Carryable).getItemType()
        : "unknown";

      // Check if item can be stacked with existing inventory
      if (!targetingSystem.canPickUpItem(inventory, itemType)) {
        // Log debug info
        const statePrefix = stateName ? ` (${stateName})` : "";
        console.log(
          `[AI DEBUG] ${player.getDisplayName()}${statePrefix} tried to interact with ${itemType} but inventory is FULL and cannot stack. Inventory: ${this.formatInventory(inventory)}`
        );
        return { success: false, reason: "cannot_stack" };
      }
    }

    // All checks passed - perform the interaction
    entity.getExt(Interactive).interact(player.getId());
    return { success: true };
  }

  /**
   * Attempt to interact with a barrel/container entity
   * Does not check inventory (barrels scatter items, not direct pickup)
   *
   * @param player - The AI player
   * @param entity - The barrel entity to interact with
   * @returns InteractionResult indicating success or failure reason
   */
  static tryInteractWithBarrel(
    player: Player,
    entity: IEntity | undefined
  ): InteractionResult {
    // Check if entity exists and is not marked for removal
    if (!entity || entity.isMarkedForRemoval()) {
      return { success: false, reason: "entity_invalid" };
    }

    // Check if entity has Interactive extension
    if (!entity.hasExt(Interactive)) {
      return { success: false, reason: "no_interactive" };
    }

    // Perform the interaction
    entity.getExt(Interactive).interact(player.getId());
    return { success: true };
  }

  /**
   * Check if an item pickup is possible without performing it
   * Useful for deciding whether to target an item
   *
   * @param player - The AI player
   * @param entity - The item entity to check
   * @param targetingSystem - The targeting system for inventory checks
   * @returns true if pickup would succeed, false otherwise
   */
  static canPickupItem(
    player: Player,
    entity: IEntity | undefined,
    targetingSystem: AITargetingSystem
  ): boolean {
    if (!entity || entity.isMarkedForRemoval()) {
      return false;
    }

    if (!entity.hasExt(Interactive)) {
      return false;
    }

    const inventory = player.getInventory();

    // If inventory is not full, can always pick up
    if (!targetingSystem.isInventoryFull(inventory)) {
      return true;
    }

    // Inventory is full - check if item can be stacked
    const itemType = entity.hasExt(Carryable)
      ? entity.getExt(Carryable).getItemType()
      : "unknown";

    return targetingSystem.canPickUpItem(inventory, itemType);
  }

  /**
   * Format inventory for debug logging
   */
  private static formatInventory(inventory: InventoryItem[]): string {
    return inventory.map(item => item?.itemType || "empty").join(", ");
  }
}
