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
import { distance } from "@shared/util/physics";
import { FISTS_INVENTORY_SENTINEL } from "@shared/constants/inventory-sentinel";

export interface InputManagerOptions {
  onCraft?: () => unknown;
  onDown?: (inputs: Input) => void;
  onFire?: (inputs: Input) => void;
  onUp?: (inputs: Input) => void;
  onLeft?: (inputs: Input) => void;
  onRight?: (inputs: Input) => void;
  onRequestCombatRoll?: (fallbackFacing: Direction) => void;
  onInteractStart?: () => void;
  onInteractEnd?: () => void;
  onSelectInventorySlot?: (slotIndex: number) => void;
  onConsumeItem?: (itemType: string | null) => void;
  onDropItem?: (slotIndex: number, amount?: number) => void;
  onToggleInstructions?: () => void;
  onShowPlayerList?: () => void;
  onHidePlayerList?: () => void;
  onToggleChat?: () => void;
  onChatInput?: (key: string, shiftKey: boolean) => void;
  onSendChat?: () => void;
  onToggleMute?: () => void;
  onToggleMap?: () => void;
  onToggleInventoryScreen?: () => void;
  /** Opens inventory (if needed) or switches tab while the panel is open. */
  onInventoryPanelFocusTab?: (
    tab: "inventory" | "character" | "abilities" | "professions" | "quests",
  ) => void;
  getInventoryActiveTab?: () => "inventory" | "character" | "abilities" | "professions" | "quests";
  onMerchantKeyDown?: (key: string) => void;
  onCraftingPanelKeyDown?: (key: string) => void;
  onEscape?: () => void;
  onRespawnRequest?: () => void;
  onSelectWeaponLoadout?: (loadout: 0 | 1 | 2) => void;
  /** Keys 4 / 5: consume assigned loadout consumable without changing selected bag or weapon row. */
  onUseLoadoutConsumable?: (which: 0 | 1) => void;
  onReloadWeapon?: () => void;
  isMerchantPanelOpen?: () => boolean;
  isCraftingPanelOpen?: () => boolean;
  isFullscreenMapOpen?: () => boolean;
  isInventoryScreenOpen?: () => boolean;
  getCameraCenterScreenX?: (canvasWidth: number) => number | null;
  isPlayerDead?: () => boolean;
  getInventory?: () => any[];
  onInventorySlotChanged?: (slot: number) => void;
  /** When true, Space does not fire (NPC dialogue open). */
  isNpcDialogueOpen?: () => boolean;
  onToggleQuestJournal?: () => void;
  isQuestCompletedModalOpen?: () => boolean;
  onDismissQuestCompletedModal?: () => void;
  getMaxInventorySlots?: () => number;
  isBankOpen?: () => boolean;
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
  "KeyE",
  "KeyH",
  "KeyI",
  "KeyJ",
  "KeyC",
  "KeyK",
  "KeyP",
  "KeyQ",
  "KeyR",
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

const suppressedGameplayKeys = new Set([
  "Space",
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyR",
]);

const COMBAT_ROLL_DOUBLE_TAP_WINDOW_MS = 260;

export class InputManager {
  private hasChanged = false;
  private inputs: Input = {
    facing: Direction.Right,
    dx: 0,
    dy: 0,
    fire: false,
    sprint: false,
    sneak: false,
  };
  private currentInventorySlot: number = 1; // Track locally for drop/consume
  private lastInputs = {
    ...this.inputs,
  };
  private isChatting = false;
  private merchantPanelConsumedKeys = new Set<string>();
  private callbacks: InputManagerOptions = {};
  private mousePosition: Vector2 | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private lastMovementSuppressed = false;
  private lastDirectionalTapAt: Partial<Record<Direction, number>> = {};
  // Store bound event handlers for cleanup
  private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyupHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundFocusHandler: (() => void) | null = null;

  private checkIfChanged() {
    this.hasChanged = JSON.stringify(this.inputs) !== JSON.stringify(this.lastInputs);
    this.lastInputs = { ...this.inputs };
  }

  private getMaxInventorySlots(): number {
    return this.callbacks.getMaxInventorySlots?.() ?? getConfig().player.MAX_INVENTORY_SLOTS;
  }

  private hasLiveGameplayInput(): boolean {
    return (
      this.inputs.dx !== 0 ||
      this.inputs.dy !== 0 ||
      this.inputs.fire ||
      this.inputs.sprint ||
      this.inputs.sneak
    );
  }

  private isMovementSuppressed(): boolean {
    return (
      this.isChatting ||
      (this.callbacks.isMerchantPanelOpen?.() ?? false) ||
      (this.callbacks.isCraftingPanelOpen?.() ?? false) ||
      (this.callbacks.isBankOpen?.() ?? false) ||
      (this.callbacks.isNpcDialogueOpen?.() ?? false) ||
      (this.callbacks.isFullscreenMapOpen?.() ?? false) ||
      (this.callbacks.isQuestCompletedModalOpen?.() ?? false)
    );
  }

  private syncMovementSuppression(): boolean {
    const isSuppressed = this.isMovementSuppressed();
    if (isSuppressed && !this.lastMovementSuppressed && this.hasLiveGameplayInput()) {
      this.clearInputs();
    }
    this.lastMovementSuppressed = isSuppressed;
    return isSuppressed;
  }

  private getSuppressedInputs(): Input {
    return {
      facing: this.inputs.facing,
      dx: 0,
      dy: 0,
      fire: false,
      sprint: false,
      sneak: false,
    };
  }

  private noteDirectionalTap(direction: Direction, timestampMs: number, isRepeat: boolean): void {
    if (isRepeat) {
      return;
    }
    const lastTap = this.lastDirectionalTapAt[direction];
    this.lastDirectionalTapAt[direction] = timestampMs;
    if (
      typeof lastTap === "number" &&
      timestampMs - lastTap > 0 &&
      timestampMs - lastTap <= COMBAT_ROLL_DOUBLE_TAP_WINDOW_MS
    ) {
      this.lastDirectionalTapAt[direction] = -Infinity;
      this.callbacks.onRequestCombatRoll?.(direction);
    }
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

    // Create and store bound handlers for cleanup
    this.boundKeydownHandler = (e: KeyboardEvent) => {
      this.blockBrowserKeys(e);
      // Ignore inputs when user is typing in a form element
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const eventCode = e.code;
      const eventKey = e.key.toLowerCase();

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

        callbacks.onChatInput?.(e.key, e.shiftKey);
        return; // Block all other inputs when chatting
      }

      this.syncMovementSuppression();

      if (callbacks.isQuestCompletedModalOpen?.()) {
        if (eventCode === "Escape" || eventCode === "Space" || eventCode === "Enter") {
          e.preventDefault();
          callbacks.onDismissQuestCompletedModal?.();
        }
        return;
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
      const isCraftingPanelOpen = callbacks.isCraftingPanelOpen?.() ?? false;
      const isBankOpen = callbacks.isBankOpen?.() ?? false;
      const isNpcDialogueOpen = callbacks.isNpcDialogueOpen?.() ?? false;

      const isInventoryScreenOpen = callbacks.isInventoryScreenOpen?.() ?? false;

      // Block all inputs if fullscreen map is open (except Escape)
      if (isFullscreenMapOpen) {
        if (eventCode === "Escape") {
          callbacks.onToggleMap?.(); // Close map with Escape
        }
        return; // Block all other inputs when map is open
      }

      if (isInventoryScreenOpen) {
        let handledInventoryHotkey = true;
        if (eventCode === "Escape") {
          callbacks.onToggleInventoryScreen?.();
        } else if (eventCode === "KeyI") {
          const tab = callbacks.getInventoryActiveTab?.() ?? "inventory";
          if (tab === "inventory") {
            callbacks.onToggleInventoryScreen?.();
          } else {
            callbacks.onInventoryPanelFocusTab?.("inventory");
          }
        } else if (eventCode === "KeyC") {
          const tab = callbacks.getInventoryActiveTab?.() ?? "inventory";
          if (tab === "character") {
            callbacks.onToggleInventoryScreen?.();
          } else {
            callbacks.onInventoryPanelFocusTab?.("character");
          }
        } else if (eventCode === "KeyK") {
          const tab = callbacks.getInventoryActiveTab?.() ?? "inventory";
          if (tab === "abilities") {
            callbacks.onToggleInventoryScreen?.();
          } else {
            callbacks.onInventoryPanelFocusTab?.("abilities");
          }
        } else if (eventCode === "KeyP") {
          const tab = callbacks.getInventoryActiveTab?.() ?? "inventory";
          if (tab === "professions") {
            callbacks.onToggleInventoryScreen?.();
          } else {
            callbacks.onInventoryPanelFocusTab?.("professions");
          }
        } else if (eventCode === "KeyQ") {
          const tab = callbacks.getInventoryActiveTab?.() ?? "inventory";
          if (tab === "quests") {
            callbacks.onToggleInventoryScreen?.();
          } else {
            callbacks.onInventoryPanelFocusTab?.("quests");
          }
        } else {
          handledInventoryHotkey = false;
        }
        if (handledInventoryHotkey) {
          return;
        }
      }

      if (eventCode === "KeyI") {
        callbacks.onToggleInventoryScreen?.();
        return;
      }

      if (eventCode === "KeyC") {
        callbacks.onInventoryPanelFocusTab?.("character");
        return;
      }
      if (eventCode === "KeyK") {
        callbacks.onInventoryPanelFocusTab?.("abilities");
        return;
      }
      if (eventCode === "KeyP") {
        callbacks.onInventoryPanelFocusTab?.("professions");
        return;
      }
      if (eventCode === "KeyQ") {
        callbacks.onInventoryPanelFocusTab?.("quests");
        return;
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

      if (isCraftingPanelOpen) {
        if (eventCode === "Escape" || eventCode === "KeyE") {
          const key = eventCode === "Escape" ? "Escape" : "e";
          callbacks.onCraftingPanelKeyDown?.(key);
        }
        return;
      }

      if ((isBankOpen || isNpcDialogueOpen) && suppressedGameplayKeys.has(eventCode)) {
        return;
      }

      // Normal game input handling - use physical key codes for WASD
      switch (eventCode) {
        case "KeyH":
          this.quickHeal();
          break;
        case "KeyW":
          callbacks.onUp?.(this.inputs);
          this.noteDirectionalTap(Direction.Up, e.timeStamp, e.repeat);
          break;
        case "KeyS":
          callbacks.onDown?.(this.inputs);
          this.noteDirectionalTap(Direction.Down, e.timeStamp, e.repeat);
          break;
        case "KeyA":
          callbacks.onLeft?.(this.inputs);
          this.noteDirectionalTap(Direction.Left, e.timeStamp, e.repeat);
          break;
        case "KeyD":
          callbacks.onRight?.(this.inputs);
          this.noteDirectionalTap(Direction.Right, e.timeStamp, e.repeat);
          break;
        case "ArrowUp":
          callbacks.onUp?.(this.inputs);
          this.noteDirectionalTap(Direction.Up, e.timeStamp, e.repeat);
          break;
        case "ArrowDown":
          callbacks.onDown?.(this.inputs);
          this.noteDirectionalTap(Direction.Down, e.timeStamp, e.repeat);
          break;
        case "ArrowLeft":
          callbacks.onLeft?.(this.inputs);
          this.noteDirectionalTap(Direction.Left, e.timeStamp, e.repeat);
          break;
        case "ArrowRight":
          callbacks.onRight?.(this.inputs);
          this.noteDirectionalTap(Direction.Right, e.timeStamp, e.repeat);
          break;
        case "KeyJ":
          callbacks.onToggleQuestJournal?.();
          break;
        case "KeyE":
          callbacks.onInteractStart?.();
          break;
        case "Digit1": {
          callbacks.onSelectWeaponLoadout?.(0);
          break;
        }
        case "Digit2": {
          callbacks.onSelectWeaponLoadout?.(1);
          break;
        }
        case "Digit3": {
          callbacks.onSelectWeaponLoadout?.(2);
          break;
        }
        case "Digit4": {
          callbacks.onUseLoadoutConsumable?.(0);
          break;
        }
        case "Digit5": {
          callbacks.onUseLoadoutConsumable?.(1);
          break;
        }
        case "KeyR": {
          callbacks.onReloadWeapon?.();
          break;
        }
        case "KeyG": {
          if (this.currentInventorySlot === FISTS_INVENTORY_SENTINEL) break;
          const currentSlot = this.currentInventorySlot - 1;
          callbacks.onDropItem?.(currentSlot);
          break;
        }
        case "KeyX": {
          if (this.currentInventorySlot === FISTS_INVENTORY_SENTINEL) break;
          const splitSlot = this.currentInventorySlot - 1;
          if (splitSlot < 0) break;

          const inventory = callbacks.getInventory?.();
          if (!inventory) break;

          const item = inventory[splitSlot];
          if (!item) break;

          const count = item.state?.count ?? 1;
          if (count <= 1) break;

          const dropAmount = Math.floor(count / 2);
          if (dropAmount <= 0) break;

          callbacks.onDropItem?.(splitSlot, dropAmount);
          break;
        }
        case "Space":
          e.preventDefault(); // Prevent page scrolling
          if (callbacks.isNpcDialogueOpen?.()) {
            break;
          }
          this.triggerFire();
          break;
        case "ShiftLeft":
        case "ShiftRight":
          this.inputs.sprint = true;
          break;
        case "ControlLeft":
        case "ControlRight":
          this.inputs.sneak = true;
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
    };

    this.boundKeyupHandler = (e: KeyboardEvent) => {
      // Ignore inputs when user is typing in a form element
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const eventCode = e.code;
      const eventKey = e.key.toLowerCase();

      this.syncMovementSuppression();

      // Check if merchant panel is open - block all inputs
      const isMerchantPanelOpen = callbacks.isMerchantPanelOpen?.() ?? false;
      const isCraftingPanelOpen = callbacks.isCraftingPanelOpen?.() ?? false;

      // Block all keyup events when merchant panel is open
      if (isMerchantPanelOpen || isCraftingPanelOpen) {
        return; // Block all keyup events when a blocking panel is open
      }

      // Check if this key was consumed by merchant panel during keydown
      if (this.merchantPanelConsumedKeys.has(eventKey)) {
        this.merchantPanelConsumedKeys.delete(eventKey);
        return; // Block this keyup event since it was consumed by merchant panel
      }

      if (callbacks.isQuestCompletedModalOpen?.()) {
        return;
      }

      const isFullscreenMapOpen = callbacks.isFullscreenMapOpen?.() ?? false;
      const isInventoryScreenOpen = callbacks.isInventoryScreenOpen?.() ?? false;

      // Use physical key codes for WASD and other action keys
      switch (eventCode) {
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
          if (callbacks.isNpcDialogueOpen?.()) {
            break;
          }
          this.releaseFire();
          break;
        case "ShiftLeft":
        case "ShiftRight":
          this.inputs.sprint = false;
          break;
        case "ControlLeft":
        case "ControlRight":
          this.inputs.sneak = false;
          break;
        case "Tab":
          e.preventDefault(); // Prevent tab from changing focus
          callbacks.onHidePlayerList?.();
          break;
      }

      this.checkIfChanged();
    };

    this.boundFocusHandler = () => {
      this.clearInputs();
      this.callbacks.onInteractEnd?.();
    };

    // Add event listeners
    window.addEventListener("keydown", this.boundKeydownHandler);
    window.addEventListener("keyup", this.boundKeyupHandler);
    window.addEventListener("focus", this.boundFocusHandler);
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
    this.inputs.sneak = false;
    this.checkIfChanged();
  }

  getHasChanged() {
    return this.hasChanged;
  }

  isChatInputActive() {
    return this.isChatting;
  }

  getInputs() {
    if (this.syncMovementSuppression()) {
      return this.getSuppressedInputs();
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
    if (this.syncMovementSuppression()) {
      return this.getSuppressedInputs();
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
    const maxSlots = this.getMaxInventorySlots();
    if (slot !== FISTS_INVENTORY_SENTINEL && (slot < 1 || slot > maxSlots)) {
      return;
    }

    if (this.currentInventorySlot === slot) {
      return;
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
    const maxSlots = this.getMaxInventorySlots();
    if (slot !== FISTS_INVENTORY_SENTINEL && (slot < 1 || slot > maxSlots)) {
      return;
    }

    if (this.currentInventorySlot === slot) {
      return;
    }

    this.currentInventorySlot = slot;
    this.callbacks.onInventorySlotChanged?.(slot);
  }

  getCurrentInventorySlot(): number {
    return this.currentInventorySlot;
  }

  reset() {
    this.hasChanged = false;
  }

  /**
   * Trigger weapon fire (for mouse click)
   */
  triggerFire() {
    if (this.syncMovementSuppression()) return;
    this.inputs.fire = true;
    this.hasChanged = true;
  }

  /**
   * Release weapon fire (for mouse release)
   */
  releaseFire() {
    if (this.syncMovementSuppression()) return;
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
    const logicalCenterX = this.callbacks.getCameraCenterScreenX?.(canvasWidth) ?? canvasWidth / 2;
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

  /**
   * Clean up all event listeners
   * Should be called when the game client is unmounted
   */
  cleanup(): void {
    if (this.boundKeydownHandler) {
      window.removeEventListener("keydown", this.boundKeydownHandler);
      this.boundKeydownHandler = null;
    }
    if (this.boundKeyupHandler) {
      window.removeEventListener("keyup", this.boundKeyupHandler);
      this.boundKeyupHandler = null;
    }
    if (this.boundFocusHandler) {
      window.removeEventListener("focus", this.boundFocusHandler);
      this.boundFocusHandler = null;
    }
  }
}
