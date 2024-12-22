import { Renderable } from "./entities/util";
import { MapManager } from "./managers/map";
import { GameState } from "./state";
import { CraftingTable } from "./ui/crafting-table";
import { Hotbar } from "./ui/hotbar";
import { Hud } from "./ui/hud";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private mapManager: MapManager;
  private hotbar: Hotbar;
  private hud: Hud;
  private craftingTable: CraftingTable;

  constructor(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    mapManager: MapManager,
    hotbar: Hotbar,
    hud: Hud,
    craftingTable: CraftingTable
  ) {
    this.ctx = ctx;
    this.gameState = gameState;
    this.mapManager = mapManager;
    this.hotbar = hotbar;
    this.hud = hud;
    this.craftingTable = craftingTable;
    this.resizeCanvas();
  }

  private getRenderableEntities(): Renderable[] {
    return this.gameState.entities.filter((entity) => {
      return "render" in entity;
    }) as Renderable[];
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

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (!this.gameState.isDay) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    this.hotbar.render(this.ctx, this.gameState);
    this.hud.render(this.ctx, this.gameState);
    this.craftingTable.render(this.ctx, this.gameState);
  }
}
