import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { AssetManager } from "@/managers/asset";
import { Panel, PanelSettings } from "./panel";

interface CoinsPanelSettings extends PanelSettings {
  marginBottom: number;
  font: string;
  spriteSize: number;
  iconGap: number;
  inventorySettings: {
    screenMarginBottom: number;
    padding: { left: number; right: number; top: number; bottom: number };
    slotsGap: number;
    slotSize: number;
  };
}

export class CoinsPanel extends Panel {
  private coinsSettings: CoinsPanelSettings;
  private assetManager: AssetManager;

  constructor(settings: CoinsPanelSettings, assetManager: AssetManager) {
    super(settings);
    this.coinsSettings = settings;
    this.assetManager = assetManager;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const myPlayer = getPlayer(gameState);
    if (!myPlayer) return;

    const coins = myPlayer.getCoins();
    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;

    this.resetTransform(ctx);

    // Calculate inventory bar position (same as in inventory-bar.ts)
    const settings = this.coinsSettings.inventorySettings;
    const hotbarHeight = settings.slotSize + settings.padding.top + settings.padding.bottom;
    const hotbarY = canvasHeight - hotbarHeight - settings.screenMarginBottom;

    // Get coin sprite
    const coinSprite = this.assetManager.get("coin");

    // Calculate text metrics
    ctx.font = this.coinsSettings.font;
    const coinsText = `${coins}`;
    const textMetrics = ctx.measureText(coinsText);

    // Calculate total width needed (sprite + gap + text)
    const contentWidth =
      this.coinsSettings.spriteSize + this.coinsSettings.iconGap + textMetrics.width;

    // Calculate container dimensions
    const containerWidth = contentWidth + this.settings.padding * 2;
    const containerHeight = this.coinsSettings.spriteSize + this.settings.padding * 2;

    // Position coin counter centered above the inventory bar
    const x = canvasWidth / 2 - containerWidth / 2;
    const y = hotbarY - containerHeight - this.coinsSettings.marginBottom;

    // Draw background with border
    this.drawPanelBackground(ctx, x, y, containerWidth, containerHeight);

    // Draw coin sprite - vertically centered
    const spriteX = x + this.settings.padding;
    const spriteY = y + this.settings.padding;
    ctx.drawImage(
      coinSprite,
      spriteX,
      spriteY,
      this.coinsSettings.spriteSize,
      this.coinsSettings.spriteSize
    );

    // Draw coin count text - vertically aligned with sprite center
    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    const textX = spriteX + this.coinsSettings.spriteSize + this.coinsSettings.iconGap;
    const textY = y + containerHeight / 2;
    ctx.fillText(coinsText, textX, textY);

    this.restoreContext(ctx);
  }
}
