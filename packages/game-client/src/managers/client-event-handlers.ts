import { GameClient } from "@/client";
import { getPlayer } from "@/util/get-player";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";

/**
 * Handles all canvas event listeners for the game client
 */
export class ClientEventHandlers {
  private gameClient: GameClient;

  private lastPointerActivitySentAt = 0;
  private static readonly POINTER_ACTIVITY_MIN_INTERVAL_MS = 2000;

  // Store canvas and bound handlers for cleanup
  private canvas: HTMLCanvasElement | null = null;
  private boundMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private boundMouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private boundMouseUpHandler: ((e: MouseEvent) => void) | null = null;

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

    // Mouse move event listener
    canvas.addEventListener("mousemove", this.boundMouseMoveHandler);

    // Mouse down event listener
    canvas.addEventListener("mousedown", this.boundMouseDownHandler);

    // Mouse up event listener
    canvas.addEventListener("mouseup", this.boundMouseUpHandler);

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
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
    const isCraftingPanelOpen = this.gameClient.getCraftingPanel().isVisible();

    // Update inventory bar hover state
    if (hud) {
      hud.updateMousePosition(x, y, canvas.width, canvas.height);
      hud.handleMouseMove(x, y, canvas.width, canvas.height);
    }

    const isHoveringInventory = hud?.isHoveringInventory() ?? false;

    // Allow world aim updates while inventory is open, but not while hovering its UI.
    if (!isFullscreenMapOpen && !isCraftingPanelOpen && !isHoveringInventory) {
      this.gameClient.getInputManager().updateMousePosition(x, y);

      const renderer = this.gameClient.getRenderer();
      if (renderer) {
        renderer.updateMousePosition(x, y);
      }
    }

    const now = performance.now();
    if (
      now - this.lastPointerActivitySentAt >= ClientEventHandlers.POINTER_ACTIVITY_MIN_INTERVAL_MS &&
      !this.gameClient.getSocketManager().getIsDisconnected()
    ) {
      this.lastPointerActivitySentAt = now;
      this.gameClient.getSocketManager().sendPointerActivity();
    }
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(e: MouseEvent, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (e.button === 2) {
      e.preventDefault();
      const hud = this.gameClient.getHud();
      if (hud?.handleInventoryContextClick(x, y, canvas.width, canvas.height)) {
        return;
      }
      return;
    }

    if (e.button !== 0) return;

    const gameState = this.gameClient.getGameState();
    const hud = this.gameClient.getHud();
    const craftingPanel = this.gameClient.getCraftingPanel();
    const placementManager = this.gameClient.getPlacementManager();
    const isFullscreenMapOpen = hud?.isFullscreenMapOpen() ?? false;
    const isNpcDialogueOpen = gameState.openDialogueNpcId != null;

    if (craftingPanel.isVisible() && craftingPanel.handleClick(x, y)) {
      placementManager?.skipNextClick();
      return;
    }

    // Handle UI clicks (inventory bar, HUD mute button, etc.)
    if (hud && hud.handleClick(x, y, canvas.width, canvas.height, e.detail)) {
      placementManager?.skipNextClick();
      return;
    }

    // Block weapon firing when fullscreen map, crafting, or NPC dialogue is open.
    // Inventory screen clicks are handled above; clicks on the gameplay column still fire.
    if (isFullscreenMapOpen || craftingPanel.isVisible() || isNpcDialogueOpen) {
      return;
    }

    // If click wasn't handled by UI, trigger weapon fire or consumable use
    const player = getPlayer(gameState);
    if (player && !player.isDead()) {
      // Zombie players can spawn zombies or attack with claw
      if (player.isZombiePlayer?.()) {
        const inputManager = (this.gameClient as any).inputManager;
        inputManager.triggerFire();
        return;
      }

      this.gameClient.getInputManager().triggerFire();
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
    const isCraftingPanelOpen = this.gameClient.getCraftingPanel().isVisible();
    const isNpcDialogueOpen = this.gameClient.getGameState().openDialogueNpcId != null;

    if (hud) {
      hud.handleMouseUp(x, y, canvas.width, canvas.height);
    }

    // Block weapon release when fullscreen map is open
    if (!isFullscreenMapOpen && !isCraftingPanelOpen && !isNpcDialogueOpen) {
      this.gameClient.getInputManager().releaseFire();
    }
  }

  /**
   * Convert canvas coordinates to world coordinates
   */
  private canvasToWorld(canvasX: number, canvasY: number, canvas: HTMLCanvasElement): Vector2 {
    const cameraManager = this.gameClient.getCameraManager();
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
}
