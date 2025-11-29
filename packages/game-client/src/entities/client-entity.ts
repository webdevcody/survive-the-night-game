import { RawEntity } from "@shared/types/entity";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { getPlayer } from "@/util/get-player";
import { renderInteractionText } from "@/util/interaction-text";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ImageLoader } from "@/managers/asset";
import {
  ClientInteractive,
  ClientPlaceable,
  ClientPositionable,
  ClientCarryable,
  ClientInventory,
} from "@/extensions";
import Vector2 from "@shared/util/vector2";
import { DEBUG_SHOW_ATTACK_RANGE } from "@shared/debug";
import { getConfig } from "@shared/config";
import { formatDisplayName } from "@/util/format";
import { itemRegistry } from "@shared/entities";
import { ItemType } from "@shared/util/inventory";
import { isAutoPickupItem } from "@/util/auto-pickup";

export abstract class ClientEntity extends ClientEntityBase implements Renderable {
  constructor(data: RawEntity, imageLoader: ImageLoader) {
    super(data, imageLoader);
  }

  abstract getZIndex(): number;

  /**
   * Check if an item can be picked up (merged into existing slot) or requires a new slot
   */
  private canItemBePickedUp(player: any, itemType: ItemType, itemState?: any): boolean {
    if (!player.hasExt(ClientInventory)) {
      return false;
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
    const itemConfig = itemRegistry.get(itemType);
    const hasCountState = itemState && typeof itemState.count === "number";
    const isStackable = itemConfig?.category === "ammo" || hasCountState;
    
    // If stackable, check if player already has this item type
    if (isStackable) {
      const items = inventory.getItems();
      return items.some((item: any) => item?.itemType === itemType);
    }

    // Not stackable and inventory is full - cannot pick up
    return false;
  }

  protected renderInteractionText(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const myPlayer = getPlayer(gameState);
    const positionable = this.getExt(ClientPositionable);
    const interactive = this.getExt(ClientInteractive);

    if (!myPlayer) {
      return;
    }

    if (myPlayer.getId() === this.getId()) {
      return;
    }

    // Zombie players cannot interact with anything - hide interaction text
    if (myPlayer.isZombiePlayer()) {
      return;
    }

    // Skip rendering interaction text for auto-pickup items
    // These items will be picked up automatically when walked over
    if (isAutoPickupItem(this, myPlayer)) {
      return;
    }

    // Skip rendering if autoPickupEnabled is true
    if (interactive.getAutoPickupEnabled()) {
      return;
    }

    const displayName = interactive.getDisplayName();
    // Skip rendering if displayName is empty, null, or undefined
    if (!displayName || displayName.trim() === "") {
      return;
    }

    const formattedDisplayName = formatDisplayName(displayName);
    const isPlaceable = this.hasExt(ClientPlaceable);

    // Add item count to display name if available
    let text = formattedDisplayName;
    if (this.hasExt(ClientCarryable)) {
      const carryable = this.getExt(ClientCarryable);
      const itemState = carryable.getItemState();
      const count = itemState?.count;
      if (count && count > 1) {
        text += ` x${count}`;
      }
    }

    let interactMessage = "";
    if (isPlaceable) {
      interactMessage += "hold ";
    }
    interactMessage += `${getConfig().keybindings.INTERACT}`;
    text += ` (${interactMessage})`;

    // Check if this is the closest interactive entity (cached in gameState)
    const isClosest = gameState.closestInteractiveEntityId === this.getId();

    // Check if item can be picked up (for carryable items)
    let textColor: string | undefined;
    if (this.hasExt(ClientCarryable)) {
      const carryable = this.getExt(ClientCarryable);
      const itemType = carryable.getItemKey() as ItemType;
      const itemState = carryable.getItemState();
      if (!this.canItemBePickedUp(myPlayer, itemType, itemState)) {
        textColor = "red"; // Show red if inventory is full and item can't be merged
      }
    }

    renderInteractionText(
      ctx,
      text,
      positionable.getCenterPosition(),
      positionable.getPosition(),
      myPlayer.getCenterPosition(),
      interactive.getOffset(),
      isClosest,
      textColor
    );
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (this.hasExt(ClientInteractive)) {
      this.renderInteractionText(ctx, gameState);
    }
  }

  public debugRenderAttackRange(
    ctx: CanvasRenderingContext2D,
    center: Vector2,
    attackRange: number
  ): void {
    if (!DEBUG_SHOW_ATTACK_RANGE) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.arc(center.x, center.y, attackRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
