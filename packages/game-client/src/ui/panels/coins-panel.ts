import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { AssetManager } from "@/managers/asset";
import { Panel, PanelSettings } from "./panel";
import { calculateHudScale } from "@/util/hud-scale";

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
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);

    this.resetTransform(ctx);

    // Calculate inventory bar position using scaled values (same as inventory-bar.ts)
    const settings = this.coinsSettings.inventorySettings;
    const scaledSlotSize = settings.slotSize * hudScale;
    const scaledPadding = {
      top: settings.padding.top * hudScale,
      bottom: settings.padding.bottom * hudScale,
    };
    const scaledScreenMarginBottom = settings.screenMarginBottom * hudScale;

    const hotbarHeight = scaledSlotSize + scaledPadding.top + scaledPadding.bottom;
    const hotbarY = canvasHeight - hotbarHeight - scaledScreenMarginBottom;

    // Get coin sprite
    const coinSprite = this.assetManager.get("coin");

    // Scale coin panel dimensions
    const scaledSpriteSize = this.coinsSettings.spriteSize * hudScale;
    const scaledIconGap = this.coinsSettings.iconGap * hudScale;
    const scaledMarginBottom = this.coinsSettings.marginBottom * hudScale;
    const scaledPanelPadding = this.settings.padding * hudScale;

    // Calculate text metrics with scaled font
    const baseFontSize = parseInt(this.coinsSettings.font);
    const scaledFontSize = baseFontSize * hudScale;
    ctx.font = `${scaledFontSize}px Arial`;
    const coinsText = `${coins}`;
    const textMetrics = ctx.measureText(coinsText);

    // Calculate total width needed (sprite + gap + text)
    const contentWidth = scaledSpriteSize + scaledIconGap + textMetrics.width;

    // Calculate container dimensions
    const containerWidth = contentWidth + scaledPanelPadding * 2;
    const containerHeight = scaledSpriteSize + scaledPanelPadding * 2;

    // Position coin counter centered above the inventory bar
    const x = canvasWidth / 2 - containerWidth / 2;
    const y = hotbarY - containerHeight - scaledMarginBottom;

    // Draw background with border
    this.drawPanelBackground(ctx, x, y, containerWidth, containerHeight);

    // Draw coin sprite - vertically centered
    const spriteX = x + scaledPanelPadding;
    const spriteY = y + scaledPanelPadding;
    ctx.drawImage(
      coinSprite,
      spriteX,
      spriteY,
      scaledSpriteSize,
      scaledSpriteSize
    );

    // Draw coin count text - vertically aligned with sprite center
    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    const textX = spriteX + scaledSpriteSize + scaledIconGap;
    const textY = y + containerHeight / 2;
    ctx.fillText(coinsText, textX, textY);

    this.restoreContext(ctx);
  }
}
