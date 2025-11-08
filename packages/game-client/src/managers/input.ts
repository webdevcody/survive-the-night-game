import { Direction, determineDirection } from "../../../game-shared/src/util/direction";
import { Input } from "../../../game-shared/src/util/input";
import Vector2 from "../../../game-shared/src/util/vector2";
import { getConfig } from "@shared/config";

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
  isMerchantPanelOpen?: () => boolean;
  isFullscreenMapOpen?: () => boolean;
  getInventory?: () => any[];
}

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

    this.inputs.inventoryItem = occupiedSlots[nextIdx];
  }

  private quickHeal() {
    const inventory = this.callbacks.getInventory?.() || [];
    if (inventory.length === 0) return;

    // Find first bandage in inventory
    const bandageIdx = inventory.findIndex((item: any) => item?.itemType === "bandage");

    if (bandageIdx !== -1) {
      // Set the consumeItemType to bandage and trigger consume
      this.inputs.consumeItemType = "bandage";
      this.inputs.consume = true;
    }
  }

  constructor(callbacks: InputManagerOptions = {}) {
    this.callbacks = callbacks;
    window.addEventListener("keydown", (e) => {
      // Ignore inputs when user is typing in a form element
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const eventCode = e.code;
      const eventKey = e.key.toLowerCase();

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

      // Handle chat mode - use key for 'y' to support all layouts
      if (eventKey === "y" && !this.isChatting) {
        this.isChatting = true;
        callbacks.onToggleChat?.();
        return;
      }

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
        case "KeyZ":
          this.quickHeal();
          break;
        case "KeyC":
          callbacks.onCraft?.();
          break;
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
        case "Space":
          callbacks.onFire?.(this.inputs);
          break;
        case "KeyG":
          callbacks.onDrop?.(this.inputs);
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

      this.updateDirection();
      this.checkIfChanged();
    });

    window.addEventListener("keyup", (e) => {
      // Ignore inputs when user is typing in a form element
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const eventCode = e.code;
      const eventKey = e.key.toLowerCase();

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
            this.inputs.inventoryItem = Number.parseInt(eventKey, 10);
            break;
          case "0":
            this.inputs.inventoryItem = 10; // Map "0" key to slot 10
            break;
        }
      }

      // Use physical key codes for WASD and other action keys
      switch (eventCode) {
        case "KeyZ":
          this.inputs.consume = false;
          this.inputs.consumeItemType = null;
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
        case "Space":
          this.inputs.fire = false;
          break;
        case "KeyG":
          this.inputs.drop = false;
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

      this.updateDirection();
      this.checkIfChanged();
    });
  }

  private updateDirection() {
    const vec = new Vector2(this.inputs.dx, this.inputs.dy);
    this.inputs.facing = determineDirection(vec) ?? this.inputs.facing;
  }

  getHasChanged() {
    return this.hasChanged;
  }

  getInputs() {
    // Return a copy to prevent external modifications from affecting internal state
    return { ...this.inputs };
  }

  setInventorySlot(slot: number) {
    if (slot >= 1 && slot <= getConfig().player.MAX_INVENTORY_SLOTS) {
      this.inputs.inventoryItem = slot;
      this.hasChanged = true;
    }
  }

  reset() {
    this.hasChanged = false;
  }
}
