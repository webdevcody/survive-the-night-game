import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { Panel, PanelSettings } from "./panel";
import { Direction } from "@shared/util/direction";
import { ClientResourcesBag } from "@/extensions";

interface ResourcesPanelSettings extends PanelSettings {
  x: number;
  y: number;
  font: string;
  spriteSize: number;
  iconGap: number;
  resourceGap: number; // Gap between wood and cloth rows
}

export class ResourcesPanel extends Panel {
  private resourcesSettings: ResourcesPanelSettings;
  private assetManager: AssetManager;

  constructor(settings: ResourcesPanelSettings, assetManager: AssetManager) {
    super(settings);
    this.resourcesSettings = settings;
    this.assetManager = assetManager;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const myPlayer = getPlayer(gameState);
    if (!myPlayer) return;

    // Get resources from extension
    let wood = 0;
    let cloth = 0;
    let coins = 0;
    
    if (myPlayer.hasExt(ClientResourcesBag)) {
      const resourcesBag = myPlayer.getExt(ClientResourcesBag);
      wood = resourcesBag.getWood();
      cloth = resourcesBag.getCloth();
      coins = resourcesBag.getCoins();
    }

    this.resetTransform(ctx);

    // Get sprites
    const woodSprite = this.assetManager.getWithDirection(
      getItemAssetKey({ itemType: "wood" }),
      Direction.Right
    );
    const clothSprite = this.assetManager.getWithDirection(
      getItemAssetKey({ itemType: "cloth" }),
      Direction.Right
    );
    const coinSprite = this.assetManager.get("coin");

    // Calculate text metrics
    ctx.font = this.resourcesSettings.font;
    const woodText = `${wood}`;
    const clothText = `${cloth}`;
    const coinsText = `${coins}`;
    const woodTextMetrics = ctx.measureText(woodText);
    const clothTextMetrics = ctx.measureText(clothText);
    const coinsTextMetrics = ctx.measureText(coinsText);

    // Calculate max content width (for alignment)
    const woodContentWidth =
      this.resourcesSettings.spriteSize + this.resourcesSettings.iconGap + woodTextMetrics.width;
    const clothContentWidth =
      this.resourcesSettings.spriteSize + this.resourcesSettings.iconGap + clothTextMetrics.width;
    const coinsContentWidth =
      this.resourcesSettings.spriteSize + this.resourcesSettings.iconGap + coinsTextMetrics.width;
    const maxContentWidth = Math.max(woodContentWidth, clothContentWidth, coinsContentWidth);

    // Calculate container dimensions (now 3 rows: wood, cloth, coins)
    const containerWidth = maxContentWidth + this.settings.padding * 2;
    const rowHeight = this.resourcesSettings.spriteSize;
    const containerHeight =
      rowHeight * 3 + this.resourcesSettings.resourceGap * 2 + this.settings.padding * 2;

    const { x, y } = this.resourcesSettings;

    // Draw background with border
    this.drawPanelBackground(ctx, x, y, containerWidth, containerHeight);

    // Draw wood row
    const woodSpriteX = x + this.settings.padding;
    const woodSpriteY = y + this.settings.padding;
    ctx.drawImage(
      woodSprite,
      woodSpriteX,
      woodSpriteY,
      this.resourcesSettings.spriteSize,
      this.resourcesSettings.spriteSize
    );

    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    const woodTextX =
      woodSpriteX + this.resourcesSettings.spriteSize + this.resourcesSettings.iconGap;
    const woodTextY = woodSpriteY + this.resourcesSettings.spriteSize / 2;
    ctx.fillText(woodText, woodTextX, woodTextY);

    // Draw cloth row
    const clothSpriteX = x + this.settings.padding;
    const clothSpriteY = woodSpriteY + rowHeight + this.resourcesSettings.resourceGap;
    ctx.drawImage(
      clothSprite,
      clothSpriteX,
      clothSpriteY,
      this.resourcesSettings.spriteSize,
      this.resourcesSettings.spriteSize
    );

    const clothTextX =
      clothSpriteX + this.resourcesSettings.spriteSize + this.resourcesSettings.iconGap;
    const clothTextY = clothSpriteY + this.resourcesSettings.spriteSize / 2;
    ctx.fillText(clothText, clothTextX, clothTextY);

    // Draw coins row
    const coinsSpriteX = x + this.settings.padding;
    const coinsSpriteY = clothSpriteY + rowHeight + this.resourcesSettings.resourceGap;
    ctx.drawImage(
      coinSprite,
      coinsSpriteX,
      coinsSpriteY,
      this.resourcesSettings.spriteSize,
      this.resourcesSettings.spriteSize
    );

    const coinsTextX =
      coinsSpriteX + this.resourcesSettings.spriteSize + this.resourcesSettings.iconGap;
    const coinsTextY = coinsSpriteY + this.resourcesSettings.spriteSize / 2;
    ctx.fillText(coinsText, coinsTextX, coinsTextY);

    this.restoreContext(ctx);
  }

  /**
   * Returns the height of the panel for layout purposes
   */
  public getHeight(): number {
    const rowHeight = this.resourcesSettings.spriteSize;
    return rowHeight * 3 + this.resourcesSettings.resourceGap * 2 + this.settings.padding * 2;
  }
}
