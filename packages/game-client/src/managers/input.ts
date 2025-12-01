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
import { isWeapon } from "@shared/util/inventory";
import { distance } from "@shared/util/physics";

export interface InputManagerOptions {
  onCraft?: () => unknown;
  onDown?: (inputs: Input) => void;
  onFire?: (inputs: Input) => void;
  onUp?: (inputs: Input) => void;
  onLeft?: (inputs: Input) => void;
  onRight?: (inputs: Input) => void;
  onInteractStart?: () => void;
  onInteractEnd?: () => void;
  onSelectInventorySlot?: (slotIndex: number) => void;
  onConsumeItem?: (itemType: string | null) => void;
  onDropItem?: (slotIndex: number, amount?: number) => void;
  onToggleInstructions?: () => void;
  onShowPlayerList?: () => void;
  onHidePlayerList?: () => void;
  onToggleChat?: () => void;
  onChatInput?: (key: string) => void;
  onSendChat?: () => void;
  onToggleMute?: () => void;
  onToggleMap?: () => void;
  onToggleInventory?: () => void;
  onMerchantKeyDown?: (key: string) => void;
  onEscape?: () => void;
  onRespawnRequest?: () => void;
  onTeleportStart?: () => void;
  onTeleportCancel?: () => void;
  onWeaponSelectByIndex?: (index: number) => void;
  isMerchantPanelOpen?: () => boolean;
  isFullscreenMapOpen?: () => boolean;
  isInventoryPanelOpen?: () => boolean;
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
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "KeyF",
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
    fire: false,
    sprint: false,
  };
  private currentInventorySlot: number = 1; // Track locally for drop/consume
  // Track the last two weapon slots used for quick switch (Q key)
  // currentWeaponSlot is the most recently selected weapon slot
  // previousWeaponSlot is the weapon slot before that
  private currentWeaponSlot: number | null = null;
  private previousWeaponSlot: number | null = null;
  private lastInputs = {
    ...this.inputs,
  };
  private isChatting = false;
  private merchantPanelConsumedKeys = new Set<string>();
  private callbacks: InputManagerOptions = {};
  private mousePosition: Vector2 | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private fKeyHeld = false;

  private checkIfChanged() {
    this.hasChanged = JSON.stringify(this.inputs) !== JSON.stringify(this.lastInputs);
    this.lastInputs = { ...this.inputs };
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
      // Send consume event with the healable item type
      this.callbacks.onConsumeItem?.(healableItem.itemType);
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

      // Track F key state for weapons HUD
      if (eventCode === "KeyF") {
        this.fKeyHeld = true;
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

      // Handle merchant panel inputs - only allow Escape and E to close
      if (isMerchantPanelOpen) {
        // Only allow Escape or E keys to close the menu
        if (eventCode === "Escape" || eventCode === "KeyE") {
          if (callbacks.onMerchantKeyDown) {
            // Convert event code to a format the panel understands
            const key = eventCode === "Escape" ? "Escape" : "e";
            callbacks.onMerchantKeyDown(key);
          }
        }
        // Block all other inputs when merchant panel is open
        return;
      }

      // Normal game input handling - use physical key codes for WASD
      switch (eventCode) {
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
        case "KeyE":
          callbacks.onInteractStart?.();
          break;
        case "KeyQ": {
          // Quick switch to previous weapon
          this.quickSwitchWeapon();
          break;
        }
        case "KeyG": {
          // Drop currently selected item
          const currentSlot = this.currentInventorySlot - 1; // Convert to 0-indexed
          callbacks.onDropItem?.(currentSlot);
          break;
        }
        case "KeyX": {
          // Toggle inventory panel
          callbacks.onToggleInventory?.();
          break;
        }
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

      // Track F key state for weapons HUD
      if (eventCode === "KeyF") {
        this.fKeyHeld = false;
      }

      // Check if merchant panel is open - block all inputs
      const isMerchantPanelOpen = callbacks.isMerchantPanelOpen?.() ?? false;

      // Block all keyup events when merchant panel is open
      if (isMerchantPanelOpen) {
        return; // Block all keyup events when merchant panel is open
      }

      // Check if this key was consumed by merchant panel during keydown
      if (this.merchantPanelConsumedKeys.has(eventKey)) {
        this.merchantPanelConsumedKeys.delete(eventKey);
        return; // Block this keyup event since it was consumed by merchant panel
      }

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
        case "KeyE":
          callbacks.onInteractEnd?.();
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

    window.addEventListener("focus", () => {
      this.clearInputs();
      this.fKeyHeld = false;
      this.callbacks.onInteractEnd?.();
      this.callbacks.onTeleportCancel?.();
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
    this.inputs.fire = false;
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
        fire: false,
        sprint: false,
      };
    }
    // If merchant panel is open, force all inputs to false/zero to prevent movement
    const isMerchantPanelOpen = this.callbacks.isMerchantPanelOpen?.() ?? false;
    if (isMerchantPanelOpen) {
      return {
        facing: this.inputs.facing,
        dx: 0,
        dy: 0,
        fire: false,
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
        fire: false,
        sprint: false,
      };
    }
    // If merchant panel is open, return cleared inputs to prevent movement
    const isMerchantPanelOpen = this.callbacks.isMerchantPanelOpen?.() ?? false;
    if (isMerchantPanelOpen) {
      return {
        facing: this.inputs.facing,
        dx: 0,
        dy: 0,
        fire: false,
        sprint: false,
      };
    }
    const inputs: Input = { ...this.inputs };
    const aimInfo = this.calculateAimInfo(
      playerWorldPos,
      cameraPos,
      canvasWidth,
      canvasHeight,
      cameraScale
    );
    if (aimInfo !== null) {
      inputs.aimAngle = aimInfo.angle;
      inputs.aimDistance = aimInfo.distance;
      // Update facing direction based on mouse cursor position
      inputs.facing = angleToDirection(aimInfo.angle);
    }
    return inputs;
  }

  setInventorySlot(slot: number) {
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    if (slot < 1 || slot > maxSlots) {
      return;
    }

    if (this.currentInventorySlot === slot) {
      return;
    }

    const inventory = this.callbacks.getInventory?.();
    if (inventory) {
      // Check if the slot we're switching TO contains a weapon
      const newItem = inventory[slot - 1];
      if (newItem && isWeapon(newItem.itemType)) {
        // Only track weapon slots - non-weapon selections don't affect quick switch
        if (this.currentWeaponSlot !== slot) {
          // Switching to a different weapon, update the weapon tracking
          this.previousWeaponSlot = this.currentWeaponSlot;
          this.currentWeaponSlot = slot;
        }
      }
      // Non-weapon items are ignored for weapon tracking
    }

    this.currentInventorySlot = slot;
    this.callbacks.onSelectInventorySlot?.(slot);
    this.callbacks.onInventorySlotChanged?.(slot);
  }

  /**
   * Set inventory slot without triggering server callbacks
   * Used when syncing from server to avoid circular updates
   */
  setInventorySlotSilent(slot: number): void {
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    if (slot < 1 || slot > maxSlots) {
      return;
    }

    if (this.currentInventorySlot === slot) {
      return;
    }

    this.currentInventorySlot = slot;
    // Only trigger UI update callback, not server send callback
    this.callbacks.onInventorySlotChanged?.(slot);
  }

  getCurrentInventorySlot(): number {
    return this.currentInventorySlot;
  }

  /**
   * Quick switch between the last two weapons used
   * Works even when a non-weapon item is currently selected
   */
  private quickSwitchWeapon(): void {
    // Don't allow quick switch while chatting
    if (this.isChatting) return;

    const inventory = this.callbacks.getInventory?.();
    if (!inventory) return;

    // Determine which weapon slot to switch to
    // If we're currently on the current weapon slot, switch to previous
    // If we're on any other slot (including non-weapons), switch to current weapon
    let targetSlot: number | null = null;

    if (this.currentInventorySlot === this.currentWeaponSlot) {
      // Currently on the most recent weapon, switch to previous weapon
      targetSlot = this.previousWeaponSlot;
    } else {
      // Currently on a different slot (non-weapon or previous weapon), switch to current weapon
      targetSlot = this.currentWeaponSlot;
    }

    if (targetSlot === null) return;

    // Verify the target weapon slot still has a weapon
    const targetItem = inventory[targetSlot - 1];
    if (!targetItem || !isWeapon(targetItem.itemType)) {
      // Target weapon slot no longer has a weapon, try to clean up tracking
      if (targetSlot === this.currentWeaponSlot) {
        this.currentWeaponSlot = this.previousWeaponSlot;
        this.previousWeaponSlot = null;
      } else if (targetSlot === this.previousWeaponSlot) {
        this.previousWeaponSlot = null;
      }
      return;
    }

    // Switch to the target weapon
    this.setInventorySlot(targetSlot);
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
    // Don't allow firing when merchant panel is open
    const isMerchantPanelOpen = this.callbacks.isMerchantPanelOpen?.() ?? false;
    if (isMerchantPanelOpen) return;
    this.inputs.fire = true;
    this.hasChanged = true;
  }

  /**
   * Release weapon fire (for mouse release)
   */
  releaseFire() {
    // Don't allow firing while chatting
    if (this.isChatting) return;
    // Don't allow firing when merchant panel is open
    const isMerchantPanelOpen = this.callbacks.isMerchantPanelOpen?.() ?? false;
    if (isMerchantPanelOpen) return;
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
   * Check if F key is currently held (for weapons HUD)
   */
  isFKeyHeld(): boolean {
    return this.fKeyHeld;
  }

  /**
   * Set F key state (used to close weapons HUD programmatically)
   */
  setFKeyHeld(held: boolean): void {
    this.fKeyHeld = held;
  }

  /**
   * @deprecated Use isFKeyHeld() instead
   */
  isAltKeyHeld(): boolean {
    return this.fKeyHeld;
  }

  /**
   * @deprecated Use setFKeyHeld() instead
   */
  setAltKeyHeld(held: boolean): void {
    this.fKeyHeld = held;
  }

  /**
   * Calculate aim angle from player center to mouse position in world coordinates
   * @param playerWorldPos Player's center position in world coordinates
   * @param cameraPos Camera position in world coordinates (what the camera is centered on)
   * @param canvasWidth Canvas width in pixels (1:1 mapping, devicePixelRatio disabled)
   * @param canvasHeight Canvas height in pixels (1:1 mapping, devicePixelRatio disabled)
   * @param cameraScale Camera zoom scale
   * @returns Angle in radians, or null if mouse position not available
   * @deprecated Use calculateAimInfo instead
   */
  calculateAimAngle(
    playerWorldPos: Vector2,
    cameraPos: Vector2,
    canvasWidth: number,
    canvasHeight: number,
    cameraScale: number = 1
  ): number | null {
    const aimInfo = this.calculateAimInfo(
      playerWorldPos,
      cameraPos,
      canvasWidth,
      canvasHeight,
      cameraScale
    );
    return aimInfo?.angle ?? null;
  }

  /**
   * Calculate aim angle and distance from player center to mouse position in world coordinates
   * @param playerWorldPos Player's center position in world coordinates
   * @param cameraPos Camera position in world coordinates (what the camera is centered on)
   * @param canvasWidth Canvas width in pixels (1:1 mapping, devicePixelRatio disabled)
   * @param canvasHeight Canvas height in pixels (1:1 mapping, devicePixelRatio disabled)
   * @param cameraScale Camera zoom scale
   * @returns Object with angle (radians) and distance (world units), or null if mouse position not available
   */
  calculateAimInfo(
    playerWorldPos: Vector2,
    cameraPos: Vector2,
    canvasWidth: number,
    canvasHeight: number,
    cameraScale: number = 1
  ): { angle: number; distance: number } | null {
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

    // Calculate angle and distance from player to mouse
    const mousePos = new Vector2(worldMouseX, worldMouseY);
    const dist = distance(playerWorldPos, mousePos);
    const dx = worldMouseX - playerWorldPos.x;
    const dy = worldMouseY - playerWorldPos.y;

    return {
      angle: Math.atan2(dy, dx),
      distance: dist,
    };
  }
}
