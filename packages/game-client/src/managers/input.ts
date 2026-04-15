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

export type InventoryUiTab = "inventory" | "character" | "abilities" | "professions" | "quests";

/** State queries InputManager needs to determine input behavior. */
export interface InputStateQueries {
  getInventory?: () => any[];
  getMaxInventorySlots?: () => number;
  getInventoryActiveTab?: () => InventoryUiTab;
  getCameraCenterScreenX?: (canvasWidth: number) => number | null;
  isCraftingPanelOpen?: () => boolean;
  isBankOpen?: () => boolean;
  isFullscreenMapOpen?: () => boolean;
  isInventoryScreenOpen?: () => boolean;
  isNpcDialogueOpen?: () => boolean;
  isQuestCompletedModalOpen?: () => boolean;
  isBlockingModalOpen?: () => boolean;
  /** If the sign read modal is open, close it and return true so interact (E) does not fall through. */
  tryCloseSignReadModalOnInteractKey?: () => boolean;
  isPlayerDead?: () => boolean;
  /** When true, block firing and combat roll (skateboard). */
  isRidingSkateboard?: () => boolean;
  /** Chat message panel visibility (Tab). */
  isChatPanelOpen?: () => boolean;
  /** Y-activated typing mode; drives movement suppression. */
  isChatComposing?: () => boolean;
}

/** Typed events emitted by InputManager. */
export interface InputEventMap {
  toggleInventoryScreen: void;
  inventoryPanelFocusTab: { tab: InventoryUiTab };
  toggleChat: void;
  toggleChatPanel: void;
  chatInput: { key: string; shiftKey: boolean };
  sendChat: void;
  toggleMute: void;
  toggleMap: void;
  interactStart: void;
  interactEnd: void;
  selectInventorySlot: { slot: number };
  consumeItem: { itemType: string | null };
  dropItem: { slot: number; amount?: number };
  craftingPanelKeyDown: { key: string };
  escape: void;
  respawnRequest: void;
  selectWeaponLoadout: { loadout: 0 | 1 | 2 };
  useLoadoutConsumable: { which: 0 | 1 };
  reloadWeapon: void;
  requestCombatRoll: { direction: Direction };
  inventorySlotChanged: { slot: number };
  dismissQuestCompletedModal: void;
}

type InputEventHandler<K extends keyof InputEventMap> =
  InputEventMap[K] extends void ? () => void : (data: InputEventMap[K]) => void;

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
const COMBAT_ROLL_DOUBLE_TAP_KEY_CODES = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);

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
  private queries: InputStateQueries = {};
  private eventListeners = new Map<string, Set<Function>>();
  private mousePosition: Vector2 | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private lastMovementSuppressed = false;
  /** Last keydown time per physical WASD key for combat roll double-tap. */
  private lastWasdCombatRollTapAt: Partial<Record<string, number>> = {};
  // Store bound event handlers for cleanup
  private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyupHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundFocusHandler: (() => void) | null = null;

  private checkIfChanged() {
    this.hasChanged = JSON.stringify(this.inputs) !== JSON.stringify(this.lastInputs);
    this.lastInputs = { ...this.inputs };
  }

  private getMaxInventorySlots(): number {
    return this.queries.getMaxInventorySlots?.() ?? getConfig().player.MAX_INVENTORY_SLOTS;
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

  private isChatComposing(): boolean {
    return this.queries.isChatComposing?.() ?? false;
  }

  private isChatPanelOpenFromQuery(): boolean {
    return this.queries.isChatPanelOpen?.() ?? false;
  }

  private isMovementSuppressed(): boolean {
    return (
      this.isChatComposing() ||
      (this.queries.isCraftingPanelOpen?.() ?? false) ||
      (this.queries.isBankOpen?.() ?? false) ||
      (this.queries.isNpcDialogueOpen?.() ?? false) ||
      (this.queries.isFullscreenMapOpen?.() ?? false) ||
      (this.queries.isQuestCompletedModalOpen?.() ?? false) ||
      (this.queries.isBlockingModalOpen?.() ?? false)
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

  private noteWasdCombatRollDoubleTap(
    eventCode: string,
    rollDirection: Direction,
    timestampMs: number,
    isRepeat: boolean,
  ): void {
    if (this.queries.isRidingSkateboard?.()) {
      return;
    }
    if (!COMBAT_ROLL_DOUBLE_TAP_KEY_CODES.has(eventCode) || isRepeat) {
      return;
    }
    const lastTap = this.lastWasdCombatRollTapAt[eventCode];
    this.lastWasdCombatRollTapAt[eventCode] = timestampMs;
    if (
      typeof lastTap === "number" &&
      timestampMs - lastTap > 0 &&
      timestampMs - lastTap <= COMBAT_ROLL_DOUBLE_TAP_WINDOW_MS
    ) {
      this.lastWasdCombatRollTapAt[eventCode] = -Infinity;
      this.emit("requestCombatRoll", { direction: rollDirection });
    }
  }

  private quickHeal() {
    const inventory = this.queries.getInventory?.() || [];
    if (inventory.length === 0) return;

    // Find first consumable and healable item in inventory
    const healableItem = inventory.find((item: any) => {
      if (!item?.itemType) return false;
      const itemConfig = itemRegistry.get(item.itemType);
      return itemConfig?.category === "consumable" && itemConfig?.healable === true;
    });

    if (healableItem) {
      this.emit("consumeItem", { itemType: healableItem.itemType });
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

  constructor(queries: InputStateQueries = {}) {
    this.queries = queries;

    // Create and store bound handlers for cleanup
    this.boundKeydownHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isFormTyping =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      // Don't steal digit/WASD/etc. from real form fields (auction modal, chat, etc.)
      if (!isFormTyping) {
        this.blockBrowserKeys(e);
      }
      if (isFormTyping) {
        return;
      }

      const eventCode = e.code;
      const eventKey = e.key.toLowerCase();

      // Tab toggles chat panel (plain Tab never reaches chat autocomplete; use Shift+Tab there).
      if (eventCode === "Tab") {
        e.preventDefault();
        this.emit("toggleChatPanel");
        return;
      }

      if (this.isChatComposing()) {
        if (eventKey === "escape") {
          this.emit("toggleChat");
          return;
        }

        if (eventKey === "enter") {
          this.emit("sendChat");
          return;
        }

        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
        }

        this.emit("chatInput", { key: e.key, shiftKey: e.shiftKey });
        return;
      }

      if (this.isChatPanelOpenFromQuery() && eventKey === "escape") {
        this.emit("toggleChatPanel");
        return;
      }

      if (eventKey === "y") {
        this.clearInputs();
        this.emit("toggleChat");
        return;
      }

      this.syncMovementSuppression();

      if (queries.isQuestCompletedModalOpen?.()) {
        if (eventCode === "Escape" || eventCode === "Space" || eventCode === "Enter") {
          e.preventDefault();
          this.emit("dismissQuestCompletedModal");
        }
        return;
      }

      if (eventCode === "KeyE" && queries.tryCloseSignReadModalOnInteractKey?.()) {
        return;
      }

      if (queries.isBlockingModalOpen?.()) {
        return;
      }

      const isFullscreenMapOpen = queries.isFullscreenMapOpen?.() ?? false;

      if (eventCode === "KeyM") {
        this.emit("toggleMap");
        return;
      }

      const isCraftingPanelOpen = queries.isCraftingPanelOpen?.() ?? false;
      const isBankOpen = queries.isBankOpen?.() ?? false;
      const isNpcDialogueOpen = queries.isNpcDialogueOpen?.() ?? false;

      const isInventoryScreenOpen = queries.isInventoryScreenOpen?.() ?? false;

      if (isFullscreenMapOpen) {
        if (eventCode === "Escape") {
          this.emit("toggleMap");
        }
        return;
      }

      if (isInventoryScreenOpen) {
        let handledInventoryHotkey = true;
        if (eventCode === "Escape") {
          this.emit("toggleInventoryScreen");
        } else if (eventCode === "KeyI") {
          const tab = queries.getInventoryActiveTab?.() ?? "inventory";
          if (tab === "inventory") {
            this.emit("toggleInventoryScreen");
          } else {
            this.emit("inventoryPanelFocusTab", { tab: "inventory" });
          }
        } else if (eventCode === "KeyC") {
          const tab = queries.getInventoryActiveTab?.() ?? "inventory";
          if (tab === "character") {
            this.emit("toggleInventoryScreen");
          } else {
            this.emit("inventoryPanelFocusTab", { tab: "character" });
          }
        } else if (eventCode === "KeyK") {
          const tab = queries.getInventoryActiveTab?.() ?? "inventory";
          if (tab === "abilities") {
            this.emit("toggleInventoryScreen");
          } else {
            this.emit("inventoryPanelFocusTab", { tab: "abilities" });
          }
        } else if (eventCode === "KeyP") {
          const tab = queries.getInventoryActiveTab?.() ?? "inventory";
          if (tab === "professions") {
            this.emit("toggleInventoryScreen");
          } else {
            this.emit("inventoryPanelFocusTab", { tab: "professions" });
          }
        } else if (eventCode === "KeyQ") {
          const tab = queries.getInventoryActiveTab?.() ?? "inventory";
          if (tab === "quests") {
            this.emit("toggleInventoryScreen");
          } else {
            this.emit("inventoryPanelFocusTab", { tab: "quests" });
          }
        } else {
          handledInventoryHotkey = false;
        }
        if (handledInventoryHotkey) {
          return;
        }
      }

      if (eventCode === "KeyI") {
        this.emit("toggleInventoryScreen");
        return;
      }

      if (eventCode === "KeyC") {
        this.emit("inventoryPanelFocusTab", { tab: "character" });
        return;
      }
      if (eventCode === "KeyK") {
        this.emit("inventoryPanelFocusTab", { tab: "abilities" });
        return;
      }
      if (eventCode === "KeyP") {
        this.emit("inventoryPanelFocusTab", { tab: "professions" });
        return;
      }
      if (eventCode === "KeyQ") {
        this.emit("inventoryPanelFocusTab", { tab: "quests" });
        return;
      }

      if (isCraftingPanelOpen) {
        if (eventCode === "Escape" || eventCode === "KeyE") {
          const key = eventCode === "Escape" ? "Escape" : "e";
          this.emit("craftingPanelKeyDown", { key });
        }
        return;
      }

      if ((isBankOpen || isNpcDialogueOpen) && suppressedGameplayKeys.has(eventCode)) {
        return;
      }

      // Normal game input handling
      switch (eventCode) {
        case "KeyH":
          this.quickHeal();
          break;
        case "KeyW":
          this.inputs.dy = -1;
          this.inputs.facing = Direction.Up;
          this.noteWasdCombatRollDoubleTap(eventCode, Direction.Up, e.timeStamp, e.repeat);
          break;
        case "KeyS":
          this.inputs.dy = 1;
          this.inputs.facing = Direction.Down;
          this.noteWasdCombatRollDoubleTap(eventCode, Direction.Down, e.timeStamp, e.repeat);
          break;
        case "KeyA":
          this.inputs.dx = -1;
          this.inputs.facing = Direction.Left;
          this.noteWasdCombatRollDoubleTap(eventCode, Direction.Left, e.timeStamp, e.repeat);
          break;
        case "KeyD":
          this.inputs.dx = 1;
          this.inputs.facing = Direction.Right;
          this.noteWasdCombatRollDoubleTap(eventCode, Direction.Right, e.timeStamp, e.repeat);
          break;
        case "ArrowUp":
          this.inputs.dy = -1;
          this.inputs.facing = Direction.Up;
          break;
        case "ArrowDown":
          this.inputs.dy = 1;
          this.inputs.facing = Direction.Down;
          break;
        case "ArrowLeft":
          this.inputs.dx = -1;
          this.inputs.facing = Direction.Left;
          break;
        case "ArrowRight":
          this.inputs.dx = 1;
          this.inputs.facing = Direction.Right;
          break;
        case "KeyE":
          this.emit("interactStart");
          break;
        case "Digit1":
          this.emit("selectWeaponLoadout", { loadout: 0 });
          break;
        case "Digit2":
          this.emit("selectWeaponLoadout", { loadout: 1 });
          break;
        case "Digit3":
          this.emit("selectWeaponLoadout", { loadout: 2 });
          break;
        case "Digit4":
          this.emit("useLoadoutConsumable", { which: 0 });
          break;
        case "Digit5":
          this.emit("useLoadoutConsumable", { which: 1 });
          break;
        case "KeyR":
          this.emit("reloadWeapon");
          break;
        case "KeyG": {
          if (this.currentInventorySlot === FISTS_INVENTORY_SENTINEL) break;
          const currentSlot = this.currentInventorySlot - 1;
          this.emit("dropItem", { slot: currentSlot });
          break;
        }
        case "KeyX": {
          if (this.currentInventorySlot === FISTS_INVENTORY_SENTINEL) break;
          const splitSlot = this.currentInventorySlot - 1;
          if (splitSlot < 0) break;

          const inventory = queries.getInventory?.();
          if (!inventory) break;

          const item = inventory[splitSlot];
          if (!item) break;

          const count = item.state?.count ?? 1;
          if (count <= 1) break;

          const dropAmount = Math.floor(count / 2);
          if (dropAmount <= 0) break;

          this.emit("dropItem", { slot: splitSlot, amount: dropAmount });
          break;
        }
        case "Space":
          e.preventDefault();
          if (queries.isNpcDialogueOpen?.()) {
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
          this.emit("toggleMute");
          break;
        case "Escape":
          this.emit("escape");
          break;
      }

      this.checkIfChanged();
    };

    this.boundKeyupHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const eventCode = e.code;
      const eventKey = e.key.toLowerCase();

      this.syncMovementSuppression();

      const isCraftingPanelOpen = queries.isCraftingPanelOpen?.() ?? false;

      if (isCraftingPanelOpen) {
        return;
      }

      if (queries.isQuestCompletedModalOpen?.()) {
        return;
      }

      if (queries.isBlockingModalOpen?.()) {
        return;
      }

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
          this.emit("interactEnd");
          break;
        case "Space":
          if (queries.isNpcDialogueOpen?.()) {
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
      }

      this.checkIfChanged();
    };

    this.boundFocusHandler = () => {
      this.clearInputs();
      this.emit("interactEnd");
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
    return this.isChatComposing();
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
    this.emit("selectInventorySlot", { slot });
    this.emit("inventorySlotChanged", { slot });
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
    this.emit("inventorySlotChanged", { slot });
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
    if (this.queries.isRidingSkateboard?.()) {
      return;
    }
    if (this.syncMovementSuppression()) return;
    this.inputs.fire = true;
    this.hasChanged = true;
  }

  /**
   * Release weapon fire (for mouse release)
   */
  releaseFire() {
    if (this.queries.isRidingSkateboard?.()) {
      this.inputs.fire = false;
      this.hasChanged = true;
      return;
    }
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
    const logicalCenterX = this.queries.getCameraCenterScreenX?.(canvasWidth) ?? canvasWidth / 2;
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

  // --- Typed event emitter ---

  on<K extends keyof InputEventMap>(event: K, handler: InputEventHandler<K>): void {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, new Set());
    this.eventListeners.get(event)!.add(handler);
  }

  off<K extends keyof InputEventMap>(event: K, handler: InputEventHandler<K>): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  private emit<K extends keyof InputEventMap>(
    event: K,
    ...args: InputEventMap[K] extends void ? [] : [InputEventMap[K]]
  ): void {
    const handlers = this.eventListeners.get(event);
    if (!handlers) return;
    for (const fn of handlers) {
      (fn as Function)(...args);
    }
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
