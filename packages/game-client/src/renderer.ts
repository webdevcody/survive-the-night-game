import { Renderable } from "@/entities/util";
import { MapManager } from "@/managers/map";
import { GameState, getEntityById } from "@/state";
import { MerchantBuyPanel } from "@/ui/merchant-buy-panel";
import { CraftingPanel } from "@/ui/crafting-panel";
import { Hud } from "@/ui/hud";
import { QuestCompletedModal } from "@/ui/quest-completed-modal";
import { ParticleManager } from "./managers/particles";
import { PlacementManager } from "./managers/placement";
import { ClientPositionable } from "@/extensions/positionable";
import { ClientInteractive, ClientInventory } from "@/extensions";
import { SpatialGrid } from "@shared/util/spatial-grid";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientDestructible } from "@/extensions/destructible";
import { perfTimer } from "@shared/util/performance";
import { beginInteractionTextFrame, flushInteractionText } from "./util/interaction-text";
import { PlayerClient } from "./entities/player";
import { isWeapon } from "@shared/util/inventory";
import { Entities } from "@shared/constants";
import { getConfig } from "@shared/config";
import { getPlayer } from "./util/get-player";
import { distance } from "@shared/util/physics";
import { isAutoPickupItem } from "./util/auto-pickup";
import { resizeCanvasToWindow } from "./util/canvas-size";
import { renderOpenDialogueSpeechBubble } from "./entities/environment/dialogue-survivor-npc";
import { renderOpenMessageDecalSpeechBubble } from "./entities/environment/message-decal";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private mapManager: MapManager;
  private hud: Hud;
  private merchantBuyPanel: MerchantBuyPanel;
  private craftingPanel: CraftingPanel;
  private questCompletedModal: QuestCompletedModal;
  private particleManager: ParticleManager;
  private getPlacementManager: () => PlacementManager | null;
  private mousePosition: { x: number; y: number } | null = null;
  public spatialGrid: SpatialGrid<ClientEntityBase> | null = null;

  constructor(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    mapManager: MapManager,
    hud: Hud,
    merchantBuyPanel: MerchantBuyPanel,
    craftingPanel: CraftingPanel,
    questCompletedModal: QuestCompletedModal,
    particleManager: ParticleManager,
    getPlacementManager: () => PlacementManager | null,
  ) {
    this.ctx = ctx;
    this.gameState = gameState;
    this.mapManager = mapManager;
    this.hud = hud;
    this.merchantBuyPanel = merchantBuyPanel;
    this.craftingPanel = craftingPanel;
    this.questCompletedModal = questCompletedModal;
    this.particleManager = particleManager;
    this.getPlacementManager = getPlacementManager;
    this.resizeCanvas();
  }

  /**
   * Initialize the spatial grid when a new map is loaded
   */
  public initializeSpatialGrid(): void {
    const mapData = this.mapManager.getMapData();
    if (!mapData.ground) return;

    // Calculate map dimensions from ground layer
    const mapWidth = mapData.ground[0].length * 16; // tileSize
    const mapHeight = mapData.ground.length * 16;

    // Clear existing grid if it exists
    if (this.spatialGrid) {
      this.spatialGrid.clear();
    }

    // Initialize with 256 cell size (16 tiles) for larger chunks
    this.spatialGrid = new SpatialGrid(mapWidth, mapHeight, 16, (entity) => {
      if (entity.hasExt(ClientPositionable)) {
        return entity.getExt(ClientPositionable).getCenterPosition();
      }
      return null;
    });

    // Add all existing entities to the grid
    const entities = this.gameState.entities;
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (entity.hasExt(ClientPositionable)) {
        this.spatialGrid.addEntity(entity);
      }
    }
  }

  /**
   * Add an entity to the spatial grid
   */
  public addEntityToSpatialGrid(entity: ClientEntityBase): void {
    if (!this.spatialGrid) return;
    if (entity.hasExt(ClientPositionable)) {
      this.spatialGrid.addEntity(entity);
    }
  }

  /**
   * Remove an entity from the spatial grid
   */
  public removeEntityFromSpatialGrid(entity: ClientEntityBase): void {
    if (!this.spatialGrid) return;
    this.spatialGrid.removeEntity(entity);
  }

  /**
   * Clear the spatial grid (useful for reconnection/reset scenarios)
   */
  public clearSpatialGrid(): void {
    if (this.spatialGrid) {
      this.spatialGrid.clear();
    }
  }

  /**
   * Update an entity's position in the spatial grid
   */
  public updateEntityInSpatialGrid(entity: ClientEntityBase): void {
    if (!this.spatialGrid) return;
    if (entity.hasExt(ClientPositionable)) {
      this.spatialGrid.updateEntity(entity);
    }
  }

  public resizeCanvas(): void {
    // Force devicePixelRatio to 1 for consistent pixel-perfect rendering
    // This simplifies coordinate calculations and ensures 1:1 pixel mapping
    resizeCanvasToWindow(this.ctx.canvas);

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
    const player = getEntityById(this.gameState, this.gameState.playerId);

    if (!player || !player.hasExt(ClientPositionable) || !this.spatialGrid) {
      return;
    }

    const playerPos = player.getExt(ClientPositionable).getCenterPosition();

    // Use spatial grid to get nearby entities
    const renderRadius = getConfig().render.ENTITY_RENDER_RADIUS;
    const interactRadius = getConfig().player.MAX_INTERACT_RADIUS;

    const nearbyEntities = this.spatialGrid.getNearbyEntities(playerPos, renderRadius);

    const entitiesToRender: any[] = [];
    var closestInteractiveEntity: ClientEntityBase | null = null;
    var closestInteractiveDistance = Infinity;
    var closestIsDeadPlayer = false;

    for (let i = 0; i < nearbyEntities.length; i++) {
      const entity = nearbyEntities[i];

      // Skip if not renderable (doesn't have render method)
      if (!("render" in entity)) continue;

      // Position check should be guaranteed by spatial grid, but safe to check ext
      if (!entity.hasExt(ClientPositionable)) continue;

      const entityPos = entity.getExt(ClientPositionable).getCenterPosition();
      const dist = distance(entityPos, playerPos);

      // Precise circle culling
      if (dist <= renderRadius) {
        entitiesToRender.push(entity);
      }

      // Check if this is an interactive entity within interaction range
      // Skip auto-pickup items - they don't need manual interaction highlighting
      if (
        entity.hasExt(ClientInteractive) &&
        entity.getId() !== player.getId() &&
        dist <= interactRadius &&
        !isAutoPickupItem(entity, player)
      ) {
        const isDeadPlayer =
          entity.getType() === Entities.PLAYER && entity instanceof PlayerClient && entity.isDead();

        // Priority: dead players first, then closest by distance
        let isCloser = false;
        if (isDeadPlayer && !closestIsDeadPlayer) {
          isCloser = true;
        } else if (!isDeadPlayer && closestIsDeadPlayer) {
          isCloser = false;
        } else {
          isCloser = dist < closestInteractiveDistance;
        }

        if (isCloser) {
          closestInteractiveEntity = entity;
          closestInteractiveDistance = dist;
          closestIsDeadPlayer = isDeadPlayer;
        }
      }
    }

    // Cache the closest interactive entity ID
    this.gameState.closestInteractiveEntityId = closestInteractiveEntity?.getId() ?? null;

    // Sort by Z-index and render
    entitiesToRender.sort((a, b) => a.getZIndex() - b.getZIndex());

    for (const entity of entitiesToRender) {
      try {
        entity.render(this.ctx, this.gameState);
      } catch (error) {
        console.error(`Error rendering entity ${entity.constructor.name}:`, error);
      }
    }
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

    // Render entities
    perfTimer.start("renderEntities");
    beginInteractionTextFrame();
    this.renderEntities();
    flushInteractionText(this.ctx);
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

    // Apply darkness overlay on top of everything (ground, collidables, entities)
    perfTimer.start("renderDarkness");
    this.mapManager.renderDarkness(this.ctx);
    perfTimer.end("renderDarkness");

    // Apply zombie "undead view" overlay if player is a zombie
    this.mapManager.renderZombieOverlay(this.ctx);

    // Dialogue speech bubble (world space) after darkness/zombie overlays so text stays readable
    renderOpenDialogueSpeechBubble(this.ctx, this.gameState);
    renderOpenMessageDecalSpeechBubble(this.ctx, this.gameState);

    // Render UI without transforms
    perfTimer.start("renderUI");
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.hud.render(this.ctx, this.gameState);
    this.merchantBuyPanel.render(this.ctx, this.gameState);
    this.craftingPanel.render(this.ctx, this.gameState);

    // Render cursor (crosshair when weapon is equipped)
    this.renderCursor();

    this.ctx.restore();
    perfTimer.end("renderUI");

    // Render pickup progress indicator above player's head (rendered after UI to be on top)
    if (this.gameState.playerId) {
      const player = getPlayer(this.gameState);
      if (player && player.hasExt(ClientPositionable)) {
        const pickupProgress = player.getPickupProgress();
        if (pickupProgress > 0) {
          const playerPos = player.getPosition();
          this.hud.renderPickupProgress(this.ctx, playerPos, pickupProgress);
        }
      }
    }

    this.questCompletedModal.render(this.ctx, this.gameState);

    perfTimer.end("render");
  }

  /**
   * Update mouse position for cursor rendering
   */
  public updateMousePosition(x: number, y: number): void {
    this.mousePosition = { x, y };
  }

  /** Last canvas-space mouse position when aim/crosshair updates are active, or null. */
  public getMousePosition(): { x: number; y: number } | null {
    return this.mousePosition;
  }

  /**
   * Render crosshair cursor when a weapon is equipped
   */
  private renderCursor(): void {
    if (!this.mousePosition) return;
    if (
      this.merchantBuyPanel.isVisible() ||
      this.craftingPanel.isVisible() ||
      this.hud.isInventoryScreenOpen() ||
      this.hud.isFullscreenMapOpen()
    ) {
      return;
    }

    // Check if player has a weapon equipped
    const player = getPlayer(this.gameState);
    if (!player) return;

    // Defensive check: ensure player has inventory extension
    if (!player.hasExt(ClientInventory)) return;

    const inventory = player.getInventory();
    if (!inventory || !Array.isArray(inventory)) return;

    const weaponItem = player.getResolvedLoadoutWeaponItem();
    const hasWeapon = !!(weaponItem && isWeapon(weaponItem.itemType));

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
