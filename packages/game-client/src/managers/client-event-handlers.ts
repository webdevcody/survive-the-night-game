import { GameClient } from "@/client";
import { getPlayer } from "@/util/get-player";
import { distance } from "@shared/util/physics";
import { getConfig } from "@shared/config";
import { infectionConfig } from "@shared/config/infection-config";
import { isWeapon, ItemType } from "@shared/util/inventory";
import { itemRegistry } from "@shared/entities";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";

/**
 * Handles all canvas event listeners for the game client
 */
export class ClientEventHandlers {
  private gameClient: GameClient;
  private scrollAccumulator: number = 0;
  private readonly SCROLL_THRESHOLD = 50; // Accumulate this much deltaY before switching slots

  // Store canvas and bound handlers for cleanup
  private canvas: HTMLCanvasElement | null = null;
  private boundMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private boundMouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private boundMouseUpHandler: ((e: MouseEvent) => void) | null = null;
  private boundWheelHandler: ((e: WheelEvent) => void) | null = null;

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
  }

  /**
   * Setup all event listeners on the canvas
   */
  setupEventListeners(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    // Create bound handlers
    this.boundMouseMoveHandler = (e: MouseEvent) => this.handleMouseMove(e, canvas);
    this.boundMouseDownHandler = (e: MouseEvent) => this.handleMouseDown(e, canvas);
    this.boundMouseUpHandler = (e: MouseEvent) => this.handleMouseUp(e, canvas);
    this.boundWheelHandler = (e: WheelEvent) => this.handleWheel(e);

    // Mouse move event listener
    canvas.addEventListener("mousemove", this.boundMouseMoveHandler);

    // Mouse down event listener
    canvas.addEventListener("mousedown", this.boundMouseDownHandler);

    // Mouse up event listener
    canvas.addEventListener("mouseup", this.boundMouseUpHandler);

    // Wheel event listener
    canvas.addEventListener("wheel", this.boundWheelHandler, { passive: false });
  }

  /**
   * Clean up all event listeners
   * Should be called when the game client is unmounted
   */
  cleanup(): void {
    if (this.canvas) {
      if (this.boundMouseMoveHandler) {
        this.canvas.removeEventListener("mousemove", this.boundMouseMoveHandler);
        this.boundMouseMoveHandler = null;
      }
      if (this.boundMouseDownHandler) {
        this.canvas.removeEventListener("mousedown", this.boundMouseDownHandler);
        this.boundMouseDownHandler = null;
      }
      if (this.boundMouseUpHandler) {
        this.canvas.removeEventListener("mouseup", this.boundMouseUpHandler);
        this.boundMouseUpHandler = null;
      }
      if (this.boundWheelHandler) {
        this.canvas.removeEventListener("wheel", this.boundWheelHandler);
        this.boundWheelHandler = null;
      }
      this.canvas = null;
    }
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(e: MouseEvent, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hud = this.gameClient.getHud();
    const isFullscreenMapOpen = hud?.isFullscreenMapOpen() ?? false;

    // Update inventory bar hover state
    if (hud) {
      hud.updateMousePosition(x, y, canvas.width, canvas.height);
      hud.handleMouseMove(x, y, canvas.width, canvas.height);
    }

    // Block aiming when fullscreen map is open
    if (!isFullscreenMapOpen) {
      // Access inputManager through private method - will need to expose getter
      const inputManager = (this.gameClient as any).inputManager;
      inputManager.updateMousePosition(x, y);

      const renderer = this.gameClient.getRenderer();
      if (renderer) {
        renderer.updateMousePosition(x, y);
      }
    }
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(e: MouseEvent, canvas: HTMLCanvasElement): void {
    // Only handle left click
    if (e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const gameState = this.gameClient.getGameState();
    const hud = this.gameClient.getHud();
    const votingPanel = this.gameClient.getVotingPanel();
    const merchantBuyPanel = (this.gameClient as any).merchantBuyPanel;
    const placementManager = this.gameClient.getPlacementManager();
    const isFullscreenMapOpen = hud?.isFullscreenMapOpen() ?? false;

    // Check voting panel clicks first (if voting is active)
    if (
      gameState.votingState?.isVotingActive &&
      votingPanel.handleClick(x, y, canvas.width, canvas.height)
    ) {
      placementManager?.skipNextClick();
      return;
    }

    // Check merchant panel clicks (if open)
    if (merchantBuyPanel.isVisible() && merchantBuyPanel.handleClick(x, y)) {
      placementManager?.skipNextClick();
      return;
    }

    // Handle UI clicks (inventory bar, HUD mute button, etc.)
    if (hud && hud.handleClick(x, y, canvas.width, canvas.height)) {
      placementManager?.skipNextClick();
      return;
    }

    // Block weapon firing when fullscreen map is open
    if (isFullscreenMapOpen) {
      return;
    }

    // If click wasn't handled by UI, trigger weapon fire or consumable use
    const player = getPlayer(gameState);
    if (player && !player.isDead()) {
      // Zombie players can spawn zombies or attack with claw
      if (player.isZombiePlayer?.()) {
        // Check if we're in infection mode
        if (gameState.gameMode === "infection") {
          // Convert canvas coordinates to world coordinates
          const worldPos = this.canvasToWorld(x, y, canvas);
          const playerPos = player.getPosition();
          const dist = distance(playerPos, worldPos);

          // Check if click is within spawn radius and cooldown is ready
          const cooldownProgress = player.getZombieSpawnCooldownProgress?.() ?? 1;
          if (dist <= infectionConfig.ZOMBIE_SPAWN_RADIUS && cooldownProgress >= 1) {
            // Spawn zombie at clicked position
            this.gameClient.getSocketManager().sendSpawnZombie(worldPos.x, worldPos.y);
            return;
          }
        }
        // If not spawning, use claw attack
        const inputManager = (this.gameClient as any).inputManager;
        inputManager.triggerFire();
        return;
      }

      const inventory = this.getInventory();
      const inputManager = (this.gameClient as any).inputManager;
      const activeSlot = inputManager.getCurrentInventorySlot();
      const activeItem = inventory[activeSlot - 1];

      if (activeItem) {
        // Check if it's a weapon
        const isWeaponItem = this.isWeaponItem(activeItem.itemType);
        // Check if it's a consumable (like energy drink)
        const itemConfig = itemRegistry.get(activeItem.itemType);
        const isConsumable = itemConfig?.category === "consumable";

        // Trigger fire for both weapons and consumables
        if (isWeaponItem || isConsumable) {
          inputManager.triggerFire();
        }
      }
    }
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(e: MouseEvent, canvas: HTMLCanvasElement): void {
    if (e.button !== 0) return; // Only handle left click

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hud = this.gameClient.getHud();
    const isFullscreenMapOpen = hud?.isFullscreenMapOpen() ?? false;

    if (hud) {
      hud.handleMouseUp(x, y, canvas.width, canvas.height);
    }

    // Block weapon release when fullscreen map is open
    if (!isFullscreenMapOpen) {
      const inputManager = (this.gameClient as any).inputManager;
      inputManager.releaseFire();
    }
  }

  /**
   * Handle wheel events for hotbar slot switching
   */
  private handleWheel(e: WheelEvent): void {
    // Prevent default scrolling behavior
    e.preventDefault();

    const gameState = this.gameClient.getGameState();
    const player = getPlayer(gameState);
    const inputManager = (this.gameClient as any).inputManager;
    const merchantBuyPanel = (this.gameClient as any).merchantBuyPanel;
    const hud = this.gameClient.getHud();

    // Check if player is dead
    if (player && player.isDead()) {
      this.scrollAccumulator = 0;
      return;
    }

    // Check if chatting
    if (inputManager.isChatInputActive()) {
      this.scrollAccumulator = 0;
      return;
    }

    // Check if merchant panel is open
    if (merchantBuyPanel.isVisible()) {
      this.scrollAccumulator = 0;
      return;
    }

    // Check if fullscreen map is open
    const isFullscreenMapOpen = hud?.isFullscreenMapOpen() ?? false;
    if (isFullscreenMapOpen) {
      this.scrollAccumulator = 0;
      return;
    }

    // Accumulate scroll delta to handle trackpad sensitivity
    this.scrollAccumulator += e.deltaY;

    // Only switch slots when accumulated delta exceeds threshold
    const absAccumulator = Math.abs(this.scrollAccumulator);
    if (absAccumulator < this.SCROLL_THRESHOLD) {
      return;
    }

    // Get current slot and max slots
    const currentSlot = inputManager.getCurrentInventorySlot();
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;

    // Determine direction
    const scrollDelta = this.scrollAccumulator > 0 ? 1 : -1;
    let newSlot = currentSlot + scrollDelta;

    // Wrap around
    if (newSlot > maxSlots) {
      newSlot = 1;
    } else if (newSlot < 1) {
      newSlot = maxSlots;
    }

    // Set the new inventory slot
    inputManager.setInventorySlot(newSlot);

    // Reset accumulator after switching
    if (this.scrollAccumulator > 0) {
      this.scrollAccumulator -= this.SCROLL_THRESHOLD;
    } else {
      this.scrollAccumulator += this.SCROLL_THRESHOLD;
    }
  }

  /**
   * Convert canvas coordinates to world coordinates
   */
  private canvasToWorld(canvasX: number, canvasY: number, canvas: HTMLCanvasElement): Vector2 {
    const cameraManager = (this.gameClient as any).cameraManager;
    const cameraScale = cameraManager.getScale();
    const cameraPos = cameraManager.getPosition();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const worldX = (canvasX - centerX) / cameraScale + cameraPos.x;
    const worldY = (canvasY - centerY) / cameraScale + cameraPos.y;

    return PoolManager.getInstance().vector2.claim(worldX, worldY);
  }

  /**
   * Get player inventory
   */
  private getInventory() {
    const gameState = this.gameClient.getGameState();
    const player = getPlayer(gameState);
    if (player) {
      return player.getInventory();
    }
    return [];
  }

  /**
   * Check if an item type is a weapon
   */
  private isWeaponItem(itemType: string): boolean {
    return isWeapon(itemType as ItemType);
  }
}
