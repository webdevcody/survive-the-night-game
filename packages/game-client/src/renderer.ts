import { Renderable } from "@/entities/util";
import { MapManager } from "@/managers/map";
import { GameState } from "@/state";
import { CraftingTable } from "@/ui/crafting-table";
import { InventoryBarUI } from "@/ui/inventory-bar";
import { Hud } from "@/ui/hud";
import { GameOverDialogUI } from "@/ui/game-over-dialog";
import { ParticleManager } from "./managers/particles";
import { ClientPositionable } from "@/extensions/positionable";
import { ClientEntityBase } from "@/extensions/client-entity";
import { RENDER_CONFIG } from "./constants/constants";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private mapManager: MapManager;
  private hotbar: InventoryBarUI;
  private hud: Hud;
  private craftingTable: CraftingTable;
  private gameOverDialog: GameOverDialogUI;
  private particleManager: ParticleManager;

  constructor(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    mapManager: MapManager,
    hotbar: InventoryBarUI,
    hud: Hud,
    craftingTable: CraftingTable,
    gameOverDialog: GameOverDialogUI,
    particleManager: ParticleManager
  ) {
    this.ctx = ctx;
    this.gameState = gameState;
    this.mapManager = mapManager;
    this.hotbar = hotbar;
    this.hud = hud;
    this.craftingTable = craftingTable;
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
    const RENDER_RADIUS_SQUARED =
      RENDER_CONFIG.ENTITY_RENDER_RADIUS * RENDER_CONFIG.ENTITY_RENDER_RADIUS;

    // Filter and sort entities within radius
    const entitiesToRender = renderableEntities.filter((entity) => {
      if (!(entity instanceof ClientEntityBase) || !entity.hasExt(ClientPositionable)) {
        return false;
      }
      const entityPos = entity.getExt(ClientPositionable).getCenterPosition();
      const dx = entityPos.x - playerPos.x;
      const dy = entityPos.y - playerPos.y;
      const distanceSquared = dx * dx + dy * dy;
      const isInRange = distanceSquared <= RENDER_RADIUS_SQUARED;
      return isInRange;
    });

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
    this.clearCanvas();
    this.mapManager.render(this.ctx);
    this.renderEntities();
    this.particleManager.render(this.ctx);

    this.mapManager.renderDarkness(this.ctx);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.hotbar.render(this.ctx, this.gameState);
    this.hud.render(this.ctx, this.gameState);
    this.craftingTable.render(this.ctx, this.gameState);
    this.gameOverDialog.render(this.ctx, this.gameState);
  }
}
