import { Renderable } from "@/entities/util";
import { MapManager } from "@/managers/map";
import { GameState } from "@/state";
import { MerchantBuyPanel } from "@/ui/merchant-buy-panel";
import { Hud } from "@/ui/hud";
import { GameOverDialogUI } from "@/ui/game-over-dialog";
import { ParticleManager } from "./managers/particles";
import { PlacementManager } from "./managers/placement";
import { ClientPositionable } from "@/extensions/positionable";
import { ClientEntityBase } from "@/extensions/client-entity";
import { getConfig } from "@shared/config";
import { perfTimer } from "@shared/util/performance";
import { DEBUG_PERFORMANCE } from "@shared/debug";
import { isWeapon } from "@shared/util/inventory";
import { PlayerClient } from "@/entities/player";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private mapManager: MapManager;
  private hud: Hud;
  private merchantBuyPanel: MerchantBuyPanel;
  private gameOverDialog: GameOverDialogUI;
  private particleManager: ParticleManager;
  private getPlacementManager: () => PlacementManager | null;
  private getTeleportState: () => { isTeleporting: boolean; progress: number } | null;
  private lastPerfLogTime: number | null = null;
  private mousePosition: { x: number; y: number } | null = null;

  constructor(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    mapManager: MapManager,
    hud: Hud,
    merchantBuyPanel: MerchantBuyPanel,
    gameOverDialog: GameOverDialogUI,
    particleManager: ParticleManager,
    getPlacementManager: () => PlacementManager | null,
    getTeleportState: () => { isTeleporting: boolean; progress: number } | null
  ) {
    this.ctx = ctx;
    this.gameState = gameState;
    this.mapManager = mapManager;
    this.hud = hud;
    this.merchantBuyPanel = merchantBuyPanel;
    this.gameOverDialog = gameOverDialog;
    this.particleManager = particleManager;
    this.getPlacementManager = getPlacementManager;
    this.getTeleportState = getTeleportState;
    this.resizeCanvas();
  }

  private getRenderableEntities(): Renderable[] {
    return this.gameState.entities.filter((entity) => {
      return "render" in entity;
    }) as unknown as Renderable[];
  }

  public resizeCanvas(): void {
    // Force devicePixelRatio to 1 for consistent pixel-perfect rendering
    // This simplifies coordinate calculations and ensures 1:1 pixel mapping
    this.ctx.canvas.width = window.innerWidth;
    this.ctx.canvas.height = window.innerHeight;
    this.ctx.canvas.style.width = `${window.innerWidth}px`;
    this.ctx.canvas.style.height = `${window.innerHeight}px`;

    this.ctx.imageSmoothingEnabled = false;
    // No scaling needed since we're using 1:1 pixel mapping
  }

  private clearCanvas(): void {
    const { width, height } = this.ctx.canvas;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();
  }

  private renderEntities(): void {
    const renderableEntities = this.getRenderableEntities();

    const player = this.gameState.playerId
      ? (this.gameState.entities.find(
          (e) => e.getId() === this.gameState.playerId
        ) as ClientEntityBase)
      : null;

    if (!player || !player.hasExt(ClientPositionable)) {
      // If no player or player has no position, render everything
      renderableEntities.sort((a, b) => a.getZIndex() - b.getZIndex());
      renderableEntities.forEach((entity) => {
        try {
          entity.render(this.ctx, this.gameState);
        } catch (error) {
          console.error(`Error rendering entity ${entity.constructor.name}:`, error);
        }
      });
      return;
    }

    const playerPos = player.getExt(ClientPositionable).getCenterPosition();

    // Filter and sort entities within radius
    const renderRadius = getConfig().render.ENTITY_RENDER_RADIUS;
    const renderRadiusSquared = renderRadius * renderRadius;

    var entitiesToRender = [];
    for (var i = 0, len = renderableEntities.length; i < len; ++i) {
      var entity = renderableEntities[i];
      if (!(entity instanceof ClientEntityBase)) continue;
      if (!entity.hasExt(ClientPositionable)) continue;
      var entityPos = entity.getExt(ClientPositionable).getCenterPosition();
      var dx = entityPos.x - playerPos.x;
      var dy = entityPos.y - playerPos.y;
      var distanceSquared = dx * dx + dy * dy;
      if (distanceSquared <= renderRadiusSquared) {
        entitiesToRender.push(entity);
      }
    }

    entitiesToRender.sort((a, b) => a.getZIndex() - b.getZIndex());

    entitiesToRender.forEach((entity) => {
      try {
        entity.render(this.ctx, this.gameState);
      } catch (error) {
        console.error(`Error rendering entity ${entity.constructor.name}:`, error);
      }
    });
  }

  public render(): void {
    perfTimer.start("render");

    this.clearCanvas();

    // Render ground tiles first
    perfTimer.start("renderGround");
    this.mapManager.renderGround(this.ctx);
    perfTimer.end("renderGround");

    // Render collidables (without   darkness yet)
    perfTimer.start("renderCollidables");
    this.mapManager.renderCollidables(this.ctx);
    perfTimer.end("renderCollidables");

    // Render decals (animated decorative sprites above ground/collidables but below entities)
    perfTimer.start("renderDecals");
    this.mapManager.renderDecals(this.ctx);
    perfTimer.end("renderDecals");

    // Render entities
    perfTimer.start("renderEntities");
    this.renderEntities();
    perfTimer.end("renderEntities");

    // Render particles
    perfTimer.start("renderParticles");
    this.particleManager.render(this.ctx);
    perfTimer.end("renderParticles");

    // Render placement ghost (if active)
    perfTimer.start("renderPlacement");
    const placementManager = this.getPlacementManager();
    if (placementManager) {
      placementManager.render(this.ctx);
    }
    perfTimer.end("renderPlacement");

    // Render teleport progress indicator above player's head
    perfTimer.start("renderTeleportProgress");
    const teleportState = this.getTeleportState();
    if (teleportState?.isTeleporting && this.gameState.playerId) {
      const player = this.gameState.entities.find(
        (e) => e.getId() === this.gameState.playerId
      ) as ClientEntityBase;
      if (player && player.hasExt(ClientPositionable)) {
        const playerPos = player.getExt(ClientPositionable).getPosition();
        this.hud.renderTeleportProgress(this.ctx, playerPos, teleportState.progress);
      }
    }
    perfTimer.end("renderTeleportProgress");

    // Render pickup progress indicator above player's head
    perfTimer.start("renderPickupProgress");
    if (this.gameState.playerId) {
      const player = this.gameState.entities.find(
        (e) => e.getId() === this.gameState.playerId
      ) as PlayerClient;
      if (player && player.hasExt(ClientPositionable)) {
        const pickupProgress = player.getPickupProgress();
        if (pickupProgress > 0) {
          const playerPos = player.getExt(ClientPositionable).getPosition();
          this.hud.renderPickupProgress(this.ctx, playerPos, pickupProgress);
        }
      }
    }
    perfTimer.end("renderPickupProgress");

    // Apply darkness overlay on top of everything (ground, collidables, entities)
    perfTimer.start("renderDarkness");
    this.mapManager.renderDarkness(this.ctx);
    perfTimer.end("renderDarkness");

    // Render UI without transforms
    perfTimer.start("renderUI");
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.hud.render(this.ctx, this.gameState);
    // Crafting table is now rendered in React component (CraftingPanel.tsx)
    this.merchantBuyPanel.render(this.ctx, this.gameState);
    this.gameOverDialog.render(this.ctx, this.gameState);

    // Render cursor (crosshair when weapon is equipped)
    this.renderCursor();

    perfTimer.end("renderUI");

    perfTimer.end("render");

    // Only print stats every second
    if (
      DEBUG_PERFORMANCE &&
      (!this.lastPerfLogTime || performance.now() - this.lastPerfLogTime > 5000)
    ) {
      perfTimer.logStats("renderGround");
      perfTimer.logStats("renderCollidables");
      perfTimer.logStats("renderEntities");
      perfTimer.logStats("renderParticles");
      perfTimer.logStats("renderDarkness");
      perfTimer.logStats("renderUI");
      perfTimer.logStats("render");
      console.log("--------------------------------");
      this.lastPerfLogTime = performance.now();
    }
  }

  /**
   * Update mouse position for cursor rendering
   */
  public updateMousePosition(x: number, y: number): void {
    this.mousePosition = { x, y };
  }

  /**
   * Render crosshair cursor when a weapon is equipped
   */
  private renderCursor(): void {
    if (!this.mousePosition) return;

    // Check if player has a weapon equipped
    const player = this.gameState.playerId
      ? this.gameState.entities.find((e) => e.getId() === this.gameState.playerId)
      : null;

    if (!player) return;

    // Get player's active inventory item
    const inventory = (player as any).getInventory?.();
    if (!inventory) return;

    const activeSlot = (player as any).getInput?.()?.inventoryItem || 1;
    const activeItem = inventory[activeSlot - 1];

    // Check if active item is a weapon
    const hasWeapon = activeItem && isWeapon(activeItem.itemType);

    if (!hasWeapon) return;

    // Draw crosshair cursor
    const ctx = this.ctx;
    const { x, y } = this.mousePosition;
    const size = 10;
    const gap = 4;
    const thickness = 2;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";

    // Draw four lines forming a crosshair
    // Top
    ctx.beginPath();
    ctx.moveTo(x, y - gap);
    ctx.lineTo(x, y - size);
    ctx.stroke();

    // Bottom
    ctx.beginPath();
    ctx.moveTo(x, y + gap);
    ctx.lineTo(x, y + size);
    ctx.stroke();

    // Left
    ctx.beginPath();
    ctx.moveTo(x - gap, y);
    ctx.lineTo(x - size, y);
    ctx.stroke();

    // Right
    ctx.beginPath();
    ctx.moveTo(x + gap, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();

    // Optional: draw center dot
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
