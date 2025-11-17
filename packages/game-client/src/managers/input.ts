import {
  Direction,
  determineDirection,
  angleToDirection,
} from "../../../game-shared/src/util/direction";
import { Input } from "../../../game-shared/src/util/input";
import Vector2 from "../../../game-shared/src/util/vector2";
import PoolManager from "../../../game-shared/src/util/pool-manager";
import { getConfig } from "@shared/config";
import { itemRegistry } from "../../../game-shared/src/entities/item-registry";

export interface InputManagerOptions {
  onCraft?: () => unknown;
  onDown?: (inputs: Input) => void;
  onFire?: (inputs: Input) => void;
  onUp?: (inputs: Input) => void;
  onLeft?: (inputs: Input) => void;
  onRight?: (inputs: Input) => void;
  onInteract?: (inputs: Input) => void;
  onDrop?: (inputs: Input) => void;
  onToggleInstructions?: () => void;
  onShowPlayerList?: () => void;
  onHidePlayerList?: () => void;
  onToggleChat?: () => void;
  onChatInput?: (key: string) => void;
  onSendChat?: () => void;
  onToggleMute?: () => void;
  onToggleMap?: () => void;
  onMerchantKey1?: () => void;
  onMerchantKey2?: () => void;
  onMerchantKey3?: () => void;
  onEscape?: () => void;
  onRespawnRequest?: () => void;
  onTeleportStart?: () => void;
  onTeleportCancel?: () => void;
  isMerchantPanelOpen?: () => boolean;
  isFullscreenMapOpen?: () => boolean;
  isPlayerDead?: () => boolean;
  getInventory?: () => any[];
  onInventorySlotChanged?: (slot: number) => void;
}

const shouldBlock = new Set([
  "Space",
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "AltLeft",
  "AltRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "KeyF",
  "KeyG",
  "KeyH",
  "KeyC",
  "Escape",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "Digit0",
]);

export class InputManager {
  private hasChanged = false;
  private inputs: Input = {
    facing: Direction.Right,
    dx: 0,
    dy: 0,
    interact: false,
    fire: false,
    inventoryItem: 1,
    drop: false,
    consume: false,
    consumeItemType: null,
    sprint: false,
  };
  private lastInputs = {
    ...this.inputs,
  };
  private isChatting = false;
  private merchantPanelConsumedKeys = new Set<string>();
  private callbacks: InputManagerOptions = {};
  private mousePosition: Vector2 | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private isAltHeld = false;

  private checkIfChanged() {
    this.hasChanged = JSON.stringify(this.inputs) !== JSON.stringify(this.lastInputs);
    this.lastInputs = { ...this.inputs };
  }

  private cycleItem(direction: 1 | -1) {
    const inventory = this.callbacks.getInventory?.() || [];
    if (inventory.length === 0) return;

    const currentSlot = this.inputs.inventoryItem; // 1-indexed (1-10)
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;

    // Find all slots that have items
    const occupiedSlots: number[] = [];
    inventory.forEach((item: any, index: number) => {
      if (item) {
        occupiedSlots.push(index + 1); // 1-indexed
      }
    });

    // If no items, don't cycle
    if (occupiedSlots.length === 0) return;

    // If only one item and it's already selected, don't cycle
    if (occupiedSlots.length === 1 && occupiedSlots[0] === currentSlot) return;

    // Find current slot in occupied slots list
    let currentIdx = occupiedSlots.indexOf(currentSlot);

    // If current slot is empty, start from -1 to select first/last item
    if (currentIdx === -1) {
      currentIdx = direction === 1 ? -1 : occupiedSlots.length;
    }

    // Move to next/previous occupied slot with wrapping
    let nextIdx = currentIdx + direction;
    if (nextIdx >= occupiedSlots.length) {
      nextIdx = 0; // Wrap to first
    } else if (nextIdx < 0) {
      nextIdx = occupiedSlots.length - 1; // Wrap to last
    }

    this.setInventorySlot(occupiedSlots[nextIdx]);
  }

  private quickHeal() {
    const inventory = this.callbacks.getInventory?.() || [];
    if (inventory.length === 0) return;

    // Find first consumable and healable item in inventory
    const healableItem = inventory.find((item: any) => {
      if (!item?.itemType) return false;
      const itemConfig = itemRegistry.get(item.itemType);
      return itemConfig?.category === "consumable" && itemConfig?.healable === true;
    });

    if (healableItem) {
      // Set the consumeItemType to the healable item and trigger consume
      this.inputs.consumeItemType = healableItem.itemType;
      this.inputs.consume = true;
    }
  }

  // ================================
  // Prevent browser stealing inputs
  // ================================
  private blockBrowserKeys(e: KeyboardEvent) {
    if (shouldBlock.has(e.code)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  constructor(callbacks: InputManagerOptions = {}) {
    this.callbacks = callbacks;
    window.addEventListener("keydown", (e) => {
      this.blockBrowserKeys(e);
      // Ignore inputs when user is typing in a form element
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const eventCode = e.code;
      const eventKey = e.key.toLowerCase();

      // Track ALT key state
      if (eventCode === "AltLeft" || eventCode === "AltRight") {
        this.isAltHeld = true;
      }

      // Check if player is dead - if so, any key triggers respawn
      const isPlayerDead = callbacks.isPlayerDead?.() ?? false;
      if (isPlayerDead) {
        callbacks.onRespawnRequest?.();
        return;
      }

      // Handle chat mode FIRST - block ALL game inputs when chatting
      // This must come before any other input handling to prevent hotkeys from triggering
      if (eventKey === "y" && !this.isChatting) {
        this.isChatting = true;
        // Clear all inputs when entering chat mode
        this.clearInputs();
        callbacks.onToggleChat?.();
        return;
      }

      // If chatting, block ALL inputs except chat-specific keys
      if (this.isChatting) {
        if (eventKey === "escape") {
          this.isChatting = false;
          callbacks.onToggleChat?.();
          return;
        }

        if (eventKey === "enter") {
          this.isChatting = false;
          callbacks.onSendChat?.();
          callbacks.onToggleChat?.();
          return;
        }

        // Prevent default behavior for arrow keys to avoid page scrolling
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
        }

        callbacks.onChatInput?.(e.key);
        return; // Block all other inputs when chatting
      }

      // Check if fullscreen map is open
      const isFullscreenMapOpen = callbacks.isFullscreenMapOpen?.() ?? false;

      // Allow M key to toggle map even when map is open
      if (eventCode === "KeyM") {
        callbacks.onToggleMap?.();
        return;
      }

      // Check if merchant panel is open
      const isMerchantPanelOpen = callbacks.isMerchantPanelOpen?.() ?? false;

      // Block all inputs if fullscreen map is open (except Escape)
      if (isFullscreenMapOpen) {
        if (eventCode === "Escape") {
          callbacks.onToggleMap?.(); // Close map with Escape
        }
        return; // Block all other inputs when map is open
      }

      // Handle merchant panel inputs first
      if (isMerchantPanelOpen) {
        switch (eventCode) {
          case "Digit1":
            this.merchantPanelConsumedKeys.add(eventKey);
            callbacks.onMerchantKey1?.();
            break;
          case "Digit2":
            this.merchantPanelConsumedKeys.add(eventKey);
            callbacks.onMerchantKey2?.();
            break;
          case "Digit3":
            this.merchantPanelConsumedKeys.add(eventKey);
            callbacks.onMerchantKey3?.();
            break;
          case "KeyF":
          case "Escape":
            callbacks.onEscape?.();
            break;
        }
        // Block all other inputs when merchant panel is open
        return;
      }

      // Normal game input handling - use physical key codes for WASD
      switch (eventCode) {
        case "KeyQ":
          this.cycleItem(-1); // Cycle to previous item
          break;
        case "KeyE":
          this.cycleItem(1); // Cycle to next item
          break;
        case "KeyH":
          this.quickHeal();
          break;
        case "KeyC": {
          // Only start teleport if player is alive and no panels are open
          if (this.isChatting) break;

          const isPlayerDead = this.callbacks.isPlayerDead?.() ?? false;
          const isMerchantPanelOpen = this.callbacks.isMerchantPanelOpen?.() ?? false;
          const isFullscreenMapOpen = this.callbacks.isFullscreenMapOpen?.() ?? false;

          if (!isPlayerDead && !isMerchantPanelOpen && !isFullscreenMapOpen) {
            this.callbacks.onTeleportStart?.();
          }
          break;
        }
        case "KeyW":
          callbacks.onUp?.(this.inputs);
          break;
        case "KeyS":
          callbacks.onDown?.(this.inputs);
          break;
        case "KeyA":
          callbacks.onLeft?.(this.inputs);
          break;
        case "KeyD":
          callbacks.onRight?.(this.inputs);
          break;
        case "ArrowUp":
          callbacks.onUp?.(this.inputs);
          break;
        case "ArrowDown":
          callbacks.onDown?.(this.inputs);
          break;
        case "ArrowLeft":
          callbacks.onLeft?.(this.inputs);
          break;
        case "ArrowRight":
          callbacks.onRight?.(this.inputs);
          break;
        case "KeyF":
          callbacks.onInteract?.(this.inputs);
          break;
        case "KeyG":
          callbacks.onDrop?.(this.inputs);
          break;
        case "Space":
          // Trigger attack with spacebar
          e.preventDefault(); // Prevent page scrolling
          this.triggerFire();
          break;
        case "ShiftLeft":
        case "ShiftRight":
          this.inputs.sprint = true;
          break;
        case "KeyI":
          callbacks.onToggleInstructions?.();
          break;
        case "KeyN":
          callbacks.onToggleMute?.();
          break;
        case "Tab":
          e.preventDefault(); // Prevent tab from changing focus
          callbacks.onShowPlayerList?.();
          break;
        case "Escape":
          callbacks.onEscape?.();
          break;
        case "Digit1":
          callbacks.onMerchantKey1?.();
          break;
        case "Digit2":
          callbacks.onMerchantKey2?.();
          break;
        case "Digit3":
          callbacks.onMerchantKey3?.();
          break;
      }

      this.checkIfChanged();
    });

    window.addEventListener("keyup", (e) => {
      // Ignore inputs when user is typing in a form element
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const eventCode = e.code;
      const eventKey = e.key.toLowerCase();

      // Track ALT key state
      if (eventCode === "AltLeft" || eventCode === "AltRight") {
        this.isAltHeld = false;
      }

      // Check if this key was consumed by merchant panel during keydown
      if (this.merchantPanelConsumedKeys.has(eventKey)) {
        this.merchantPanelConsumedKeys.delete(eventKey);
        return; // Block this keyup event since it was consumed by merchant panel
      }

      // Check if merchant panel is open - block inventory switching if so
      const isMerchantPanelOpen = callbacks.isMerchantPanelOpen?.() ?? false;

      // Use key for number keys (characters work the same across layouts)
      // Only allow inventory switching when merchant panel is closed
      if (!isMerchantPanelOpen) {
        switch (eventKey) {
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
            this.setInventorySlot(Number.parseInt(eventKey, 10));
            break;
          case "0":
            this.setInventorySlot(10); // Map "0" key to slot 10
            break;
        }
      }

      // Use physical key codes for WASD and other action keys
      switch (eventCode) {
        case "KeyH":
          this.inputs.consume = false;
          this.inputs.consumeItemType = null;
          break;
        case "KeyC":
          this.callbacks.onTeleportCancel?.();
          break;
        case "KeyW":
          this.inputs.dy = this.inputs.dy === -1 ? 0 : this.inputs.dy;
          break;
        case "KeyS":
          this.inputs.dy = this.inputs.dy === 1 ? 0 : this.inputs.dy;
          break;
        case "KeyA":
          this.inputs.dx = this.inputs.dx === -1 ? 0 : this.inputs.dx;
          break;
        case "KeyD":
          this.inputs.dx = this.inputs.dx === 1 ? 0 : this.inputs.dx;
          break;
        case "ArrowUp":
          this.inputs.dy = this.inputs.dy === -1 ? 0 : this.inputs.dy;
          break;
        case "ArrowDown":
          this.inputs.dy = this.inputs.dy === 1 ? 0 : this.inputs.dy;
          break;
        case "ArrowLeft":
          this.inputs.dx = this.inputs.dx === -1 ? 0 : this.inputs.dx;
          break;
        case "ArrowRight":
          this.inputs.dx = this.inputs.dx === 1 ? 0 : this.inputs.dx;
          break;
        case "KeyF":
          this.inputs.interact = false;
          break;
        case "KeyG":
          this.inputs.drop = false;
          break;
        case "Space":
          // Release attack with spacebar
          this.releaseFire();
          break;
        case "ShiftLeft":
        case "ShiftRight":
          this.inputs.sprint = false;
          break;
        case "Tab":
          e.preventDefault(); // Prevent tab from changing focus
          callbacks.onHidePlayerList?.();
          break;
      }

      this.checkIfChanged();
    });
  }

  private updateDirection() {
    const poolManager = PoolManager.getInstance();
    const vec = poolManager.vector2.claim(this.inputs.dx, this.inputs.dy);
    this.inputs.facing = determineDirection(vec) ?? this.inputs.facing;
  }

  private clearInputs() {
    // Reset all action inputs to their default state
    this.inputs.dx = 0;
    this.inputs.dy = 0;
    this.inputs.interact = false;
    this.inputs.fire = false;
    this.inputs.drop = false;
    this.inputs.consume = false;
    this.inputs.consumeItemType = null;
    this.inputs.sprint = false;
    this.checkIfChanged();
  }

  getHasChanged() {
    return this.hasChanged;
  }

  isChatInputActive() {
    return this.isChatting;
  }

  getInputs() {
    // If chatting, force all inputs to false/zero to prevent movement
    if (this.isChatting) {
      return {
        facing: this.inputs.facing,
        dx: 0,
        dy: 0,
        interact: false,
        fire: false,
        inventoryItem: this.inputs.inventoryItem,
        drop: false,
        consume: false,
        consumeItemType: null,
        sprint: false,
      };
    }
    // Return a copy to prevent external modifications from affecting internal state
    // Note: aimAngle will be calculated and set externally after getting inputs
    return { ...this.inputs };
  }

  /**
   * Get inputs with aim angle calculated from current mouse position
   * @param playerWorldPos Player's center position in world coordinates
   * @param cameraPos Camera position in world coordinates
   * @param canvasWidth Canvas width
   * @param canvasHeight Canvas height
   * @param cameraScale Camera zoom scale
   */
  getInputsWithAim(
    playerWorldPos: Vector2,
    cameraPos: Vector2,
    canvasWidth: number,
    canvasHeight: number,
    cameraScale: number = 1
  ): Input {
    // If chatting, return cleared inputs (same as getInputs)
    if (this.isChatting) {
      return {
        facing: this.inputs.facing,
        dx: 0,
        dy: 0,
        interact: false,
        fire: false,
        inventoryItem: this.inputs.inventoryItem,
        drop: false,
        consume: false,
        consumeItemType: null,
        sprint: false,
      };
    }
    const inputs: Input = { ...this.inputs };
    const aimAngle = this.calculateAimAngle(
      playerWorldPos,
      cameraPos,
      canvasWidth,
      canvasHeight,
      cameraScale
    );
    if (aimAngle !== null) {
      inputs.aimAngle = aimAngle;
      // Update facing direction based on mouse cursor position
      inputs.facing = angleToDirection(aimAngle);
    }
    return inputs;
  }

  setInventorySlot(slot: number) {
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    if (slot < 1 || slot > maxSlots) {
      return;
    }

    if (this.inputs.inventoryItem === slot) {
      return;
    }

    this.inputs.inventoryItem = slot;
    this.hasChanged = true;
    this.callbacks.onInventorySlotChanged?.(slot);
  }

  reset() {
    this.hasChanged = false;
  }

  /**
   * Trigger weapon fire (for mouse click)
   */
  triggerFire() {
    // Don't allow firing while chatting
    if (this.isChatting) return;
    this.inputs.fire = true;
    this.hasChanged = true;
  }

  /**
   * Release weapon fire (for mouse release)
   */
  releaseFire() {
    // Don't allow firing while chatting
    if (this.isChatting) return;
    this.inputs.fire = false;
    this.hasChanged = true;
  }

  /**
   * Set the canvas element for mouse tracking
   */
  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * Update mouse position in canvas coordinates
   */
  updateMousePosition(canvasX: number, canvasY: number) {
    const poolManager = PoolManager.getInstance();
    this.mousePosition = poolManager.vector2.claim(canvasX, canvasY);
  }

  /**
   * Get the current mouse position in canvas coordinates
   */
  getMousePosition(): Vector2 | null {
    return this.mousePosition;
  }

  /**
   * Check if ALT key is currently held
   */
  isAltKeyHeld(): boolean {
    return this.isAltHeld;
  }

  /**
   * Set ALT key state (used to close weapons HUD programmatically)
   */
  setAltKeyHeld(held: boolean): void {
    this.isAltHeld = held;
  }

  /**
   * Calculate aim angle from player center to mouse position in world coordinates
   * @param playerWorldPos Player's center position in world coordinates
   * @param cameraPos Camera position in world coordinates (what the camera is centered on)
   * @param canvasWidth Canvas width in pixels (1:1 mapping, devicePixelRatio disabled)
   * @param canvasHeight Canvas height in pixels (1:1 mapping, devicePixelRatio disabled)
   * @param cameraScale Camera zoom scale
   * @returns Angle in radians, or null if mouse position not available
   */
  calculateAimAngle(
    playerWorldPos: Vector2,
    cameraPos: Vector2,
    canvasWidth: number,
    canvasHeight: number,
    cameraScale: number = 1
  ): number | null {
    if (!this.mousePosition) return null;

    // Mouse position is in canvas pixels (1:1 mapping, devicePixelRatio is disabled)
    // Canvas dimensions are also in canvas pixels (1:1 mapping)

    // Get the center of the canvas
    const logicalCenterX = canvasWidth / 2;
    const logicalCenterY = canvasHeight / 2;

    // Mouse position is already in logical pixels (1:1 mapping)
    const logicalMouseX = this.mousePosition.x;
    const logicalMouseY = this.mousePosition.y;

    // Calculate offset from center in logical pixels
    const offsetX = logicalMouseX - logicalCenterX;
    const offsetY = logicalMouseY - logicalCenterY;

    // Convert to world coordinates by dividing by camera scale and adding camera position
    const worldMouseX = cameraPos.x + offsetX / cameraScale;
    const worldMouseY = cameraPos.y + offsetY / cameraScale;

    // Calculate angle from player to mouse
    const dx = worldMouseX - playerWorldPos.x;
    const dy = worldMouseY - playerWorldPos.y;

    return Math.atan2(dy, dx);
  }
}
