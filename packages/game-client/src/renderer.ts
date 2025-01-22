import { Renderable } from "@/entities/util";
import { MapManager } from "@/managers/map";
import { GameState } from "@/state";
import { CraftingTable } from "@/ui/crafting-table";
import { InventoryBarUI } from "@/ui/inventory-bar";
import { Hud } from "@/ui/hud";
import { GameOverDialogUI } from "@/ui/game-over-dialog";
import { ParticleManager } from "./managers/particles";

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

    renderableEntities.sort((a, b) => a.getZIndex() - b.getZIndex());

    renderableEntities.forEach((entity) => {
      entity.render(this.ctx, this.gameState);
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
