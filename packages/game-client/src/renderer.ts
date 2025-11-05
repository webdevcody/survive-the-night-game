import { Renderable } from "@/entities/util";
import { MapManager } from "@/managers/map";
import { GameState } from "@/state";
import { CraftingTable } from "@/ui/crafting-table";
import { MerchantBuyPanel } from "@/ui/merchant-buy-panel";
import { InventoryBarUI } from "@/ui/inventory-bar";
import { Hud } from "@/ui/hud";
import { GameOverDialogUI } from "@/ui/game-over-dialog";
import { ParticleManager } from "./managers/particles";
import { ClientPositionable } from "@/extensions/positionable";
import { ClientEntityBase } from "@/extensions/client-entity";
import { RENDER_CONFIG } from "./constants/constants";
import { perfTimer } from "@shared/util/performance";
import { DEBUG_PERFORMANCE } from "@shared/debug";

const RENDER_RADIUS_SQUARED =
  RENDER_CONFIG.ENTITY_RENDER_RADIUS * RENDER_CONFIG.ENTITY_RENDER_RADIUS;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private mapManager: MapManager;
  private hotbar: InventoryBarUI;
  private hud: Hud;
  private craftingTable: CraftingTable;
  private merchantBuyPanel: MerchantBuyPanel;
  private gameOverDialog: GameOverDialogUI;
  private particleManager: ParticleManager;
  private lastPerfLogTime: number | null = null;

  constructor(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    mapManager: MapManager,
    hotbar: InventoryBarUI,
    hud: Hud,
    craftingTable: CraftingTable,
    merchantBuyPanel: MerchantBuyPanel,
    gameOverDialog: GameOverDialogUI,
    particleManager: ParticleManager
  ) {
    this.ctx = ctx;
    this.gameState = gameState;
    this.mapManager = mapManager;
    this.hotbar = hotbar;
    this.hud = hud;
    this.craftingTable = craftingTable;
    this.merchantBuyPanel = merchantBuyPanel;
    this.gameOverDialog = gameOverDialog;
    this.particleManager = particleManager;
    this.resizeCanvas();
  }

  private getRenderableEntities(): Renderable[] {
    return this.gameState.entities.filter((entity) => {
      return "render" in entity;
    }) as unknown as Renderable[];
  }

  public resizeCanvas(): void {
    this.ctx.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.ctx.canvas.height = window.innerHeight * window.devicePixelRatio;
    this.ctx.canvas.style.width = `${window.innerWidth}px`;
    this.ctx.canvas.style.height = `${window.innerHeight}px`;

    this.ctx.imageSmoothingEnabled = false;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
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
    var entitiesToRender = [];
    for (var i = 0, len = renderableEntities.length; i < len; ++i) {
      var entity = renderableEntities[i];
      if (!(entity instanceof ClientEntityBase)) continue;
      if (!entity.hasExt(ClientPositionable)) continue;
      var entityPos = entity.getExt(ClientPositionable).getCenterPosition();
      var dx = entityPos.x - playerPos.x;
      var dy = entityPos.y - playerPos.y;
      var distanceSquared = dx * dx + dy * dy;
      if (distanceSquared <= RENDER_RADIUS_SQUARED) {
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

    // Render entities
    perfTimer.start("renderEntities");
    this.renderEntities();
    perfTimer.end("renderEntities");

    // Render particles
    perfTimer.start("renderParticles");
    this.particleManager.render(this.ctx);
    perfTimer.end("renderParticles");

    // Apply darkness overlay on top of everything (ground, collidables, entities)
    perfTimer.start("renderDarkness");
    this.mapManager.renderDarkness(this.ctx);
    perfTimer.end("renderDarkness");

    // Render UI without transforms
    perfTimer.start("renderUI");
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.hotbar.render(this.ctx, this.gameState);
    this.hud.render(this.ctx, this.gameState);
    this.craftingTable.render(this.ctx, this.gameState);
    this.merchantBuyPanel.render(this.ctx, this.gameState);
    this.gameOverDialog.render(this.ctx, this.gameState);
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
}
