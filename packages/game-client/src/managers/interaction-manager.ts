import { GameState, getEntityById } from "@/state";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientCarryable, ClientInventory, ClientPlaceable, ClientPositionable } from "@/extensions";
import { getClosestInteractiveEntity } from "@/util/get-closest-interactive";
import { getPlayer } from "@/util/get-player";
import { distance } from "@shared/util/physics";
import { getConfig } from "@shared/config";
import { ItemType, InventoryItem } from "@shared/util/inventory";
import { itemRegistry } from "@shared/entities";

/**
 * Manages interaction state and logic for the game client
 */
export class InteractionManager {
  private isHoldingInteract: boolean = false;
  private interactHoldStartTime: number = 0;
  private interactHoldTargetEntityId: number | null = null;
  private interactHoldCompleted: boolean = false; // Prevent immediate restart after completion
  private readonly INTERACT_HOLD_DURATION = 500; // 0.5 seconds in milliseconds

  private static lastInventoryFullMessageTime: number = 0;
  private static readonly INVENTORY_FULL_MESSAGE_COOLDOWN = 2000; // 2 seconds

  /**
   * Start interact hold - begins tracking hold progress for placeable items
   */
  startInteractHold(
    gameState: GameState,
    spatialGrid: any,
    showInventoryFullMessage: (message: string, color: string) => void
  ): number | null {
    // Don't restart if we just completed an interact (prevent immediate restart)
    if (this.isHoldingInteract) {
      return null;
    }

    const player = getPlayer(gameState);
    if (!player) return null;

    // Find closest interactive entity (use spatial grid if available)
    const closestEntity = getClosestInteractiveEntity(gameState, spatialGrid);
    if (!closestEntity) {
      // No entity nearby, nothing to interact with
      return null;
    }

    // Check if entity is placeable (requires hold)
    const isPlaceable = closestEntity.hasExt(ClientPlaceable);

    if (isPlaceable) {
      // Start hold timer
      this.isHoldingInteract = true;
      this.interactHoldStartTime = Date.now();
      this.interactHoldTargetEntityId = closestEntity.getId();
      this.interactHoldCompleted = false; // Reset completion flag

      // Initialize player's pickup progress for rendering
      const playerEntity = getPlayer(gameState);
      if (playerEntity) {
        (playerEntity as any).pickupProgress = 0;
      }

      return closestEntity.getId();
    } else {
      // Not placeable, check if can pick up before returning entity ID
      if (!this.canItemBePickedUp(closestEntity, gameState)) {
        showInventoryFullMessage("Inventory full!", "red");
        return null;
      }

      // Return entity ID for immediate interaction
      return closestEntity.getId();
    }
  }

  /**
   * Cancel interact hold
   */
  cancelInteractHold(gameState: GameState): void {
    if (!this.isHoldingInteract) return;

    this.isHoldingInteract = false;
    this.interactHoldStartTime = 0;
    this.interactHoldTargetEntityId = null;

    // Reset player's pickup progress
    const playerEntity = getPlayer(gameState);
    if (playerEntity) {
      (playerEntity as any).pickupProgress = 0;
    }
  }

  /**
   * Complete interact hold - called after successfully sending interact event
   */
  completeInteractHold(): void {
    // Mark as completed to prevent immediate restart
    this.interactHoldCompleted = true;

    // Reset after a short delay to allow the event to be processed
    setTimeout(() => {
      this.interactHoldCompleted = false;
    }, 100); // 100ms delay before allowing restart

    this.isHoldingInteract = false;
    this.interactHoldStartTime = 0;
    this.interactHoldTargetEntityId = null;
  }

  /**
   * Update interact hold progress and return entity ID if interaction should be triggered
   */
  updateInteractHold(
    gameState: GameState,
    inputManager: { getInputs: () => { dx: number; dy: number } },
    showInventoryFullMessage: (message: string, color: string) => void
  ): number | null {
    if (!this.isHoldingInteract) {
      return null;
    }

    const player = getPlayer(gameState);
    if (!player) {
      this.cancelInteractHold(gameState);
      return null;
    }

    // Check if target entity still exists and is in range
    const targetEntity = this.interactHoldTargetEntityId
      ? getEntityById(gameState, this.interactHoldTargetEntityId)
      : null;

    if (
      !targetEntity ||
      !targetEntity.hasExt(ClientPositionable) ||
      !targetEntity.hasExt(ClientPlaceable)
    ) {
      this.cancelInteractHold(gameState);
      return null;
    }

    // Check distance
    const playerPos = player.getCenterPosition();
    const entityPos = targetEntity.getExt(ClientPositionable).getCenterPosition();
    const dist = distance(entityPos, playerPos);
    const maxRadius = getConfig().player.MAX_INTERACT_RADIUS;

    if (dist > maxRadius) {
      this.cancelInteractHold(gameState);
      return null;
    }

    // Check if player moved (has movement input)
    // Only cancel if movement is significant (allow tiny movements)
    const input = inputManager.getInputs();
    const hasMovement = Math.abs(input.dx) > 0.1 || Math.abs(input.dy) > 0.1;
    if (hasMovement) {
      this.cancelInteractHold(gameState);
      return null;
    }

    // Update progress
    const now = Date.now();
    const elapsed = now - this.interactHoldStartTime;
    const progress = Math.min(1, elapsed / this.INTERACT_HOLD_DURATION);

    // Update player's pickup progress for rendering
    const playerEntity = getPlayer(gameState);
    if (playerEntity) {
      (playerEntity as any).pickupProgress = progress;
    }

    // If progress reaches 1.0, interact is complete
    if (progress >= 1) {
      // Ensure progress is clamped to 1.0 for final render
      if (playerEntity) {
        (playerEntity as any).pickupProgress = 1.0;
      }

      // Check if can pick up before sending interact
      if (targetEntity && !this.canItemBePickedUp(targetEntity, gameState)) {
        showInventoryFullMessage("Inventory full!", "red");
        this.cancelInteractHold(gameState);
        return null;
      }

      // Complete the hold (prevents immediate restart)
      this.completeInteractHold();
      return this.interactHoldTargetEntityId;
    }

    return null;
  }

  /**
   * Check if an item can be picked up (merged into existing slot) or requires a new slot
   */
  private canItemBePickedUp(entity: ClientEntityBase, gameState: GameState): boolean {
    const player = getPlayer(gameState);
    if (!player || !player.hasExt(ClientInventory)) {
      return false;
    }

    if (!entity.hasExt(ClientCarryable)) {
      return true; // Not a carryable item, can always interact
    }

    const inventory = player.getExt(ClientInventory);

    // If inventory is not full, can always pick up
    if (!inventory.isFull()) {
      return true;
    }

    // Check if item is stackable (can merge with existing)
    // Items are stackable if:
    // - They have category "ammo" (all ammo items are stackable)
    // - They have a count state property (meaning they're stackable in inventory)
    const carryable = entity.getExt(ClientCarryable);
    const itemType = carryable.getItemKey() as ItemType;
    const itemState = carryable.getItemState();
    const itemConfig = itemRegistry.get(itemType);
    const hasCountState = itemState && typeof itemState.count === "number";
    const isStackable = itemConfig?.category === "ammo" || hasCountState;

    // If stackable, check if player already has this item type
    if (isStackable) {
      const items = inventory.getItems();
      return items.some((item) => item?.itemType === itemType);
    }

    // Not stackable and inventory is full - cannot pick up
    return false;
  }

  /**
   * Get current interact hold progress (0-1)
   */
  getInteractProgress(): number {
    if (!this.isHoldingInteract) {
      return 0;
    }

    const now = Date.now();
    const elapsed = now - this.interactHoldStartTime;
    return Math.min(1, elapsed / this.INTERACT_HOLD_DURATION);
  }
}

