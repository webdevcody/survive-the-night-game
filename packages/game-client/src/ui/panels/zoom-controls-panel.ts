import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { ZoomController } from "@/zoom-controller";

export interface ZoomControlsPanelSettings extends PanelSettings {
  left: number;
  bottom: number;
  buttonWidth: number;
  buttonHeight: number;
  buttonGap: number;
  font: string;
  hoverBackground: string;
}

export class ZoomControlsPanel extends Panel {
  private buttonSettings: ZoomControlsPanelSettings;
  private zoomController: ZoomController;
  private zoomInButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private zoomOutButtonBounds: { x: number; y: number; width: number; height: number } | null =
    null;
  private zoomTextBounds: { x: number; y: number; width: number; height: number } | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor(settings: ZoomControlsPanelSettings, zoomController: ZoomController) {
    super(settings);
    this.buttonSettings = settings;
    this.zoomController = zoomController;
  }

  public updateMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.resetTransform(ctx);

    const { height } = ctx.canvas;
    const zoom = this.zoomController.getZoom();

    // Calculate panel position
    const panelX = this.buttonSettings.left;
    const panelY = height - this.buttonSettings.bottom - this.buttonSettings.buttonHeight;

    // Calculate button positions
    const buttonGap = this.buttonSettings.buttonGap;
    const buttonWidth = this.buttonSettings.buttonWidth;
    const buttonHeight = this.buttonSettings.buttonHeight;

    // Zoom text (center) - calculate first to center everything
    ctx.font = this.buttonSettings.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Convert zoom (2-6) to percentage where 2 = 100% (baseline, most zoomed out)
    // and 6 = 300% (most zoomed in)
    const zoomPercent = Math.round((zoom / 2) * 100);
    const zoomText = `Zoom: ${zoomPercent}%`;
    const zoomTextWidth = ctx.measureText(zoomText).width;
    const zoomTextHeight = 20; // Approximate text height

    // Calculate total width needed
    const totalWidth = buttonWidth + buttonGap + zoomTextWidth + buttonGap + buttonWidth;
    const startX = panelX;

    // Zoom out button (leftmost)
    const zoomOutX = startX;
    const zoomOutY = panelY;

    this.zoomOutButtonBounds = {
      x: zoomOutX,
      y: zoomOutY,
      width: buttonWidth,
      height: buttonHeight,
    };

    // Zoom text (center)
    const zoomTextX = zoomOutX + buttonWidth + buttonGap + zoomTextWidth / 2;
    const zoomTextY = zoomOutY + buttonHeight / 2;

    this.zoomTextBounds = {
      x: zoomTextX - zoomTextWidth / 2,
      y: zoomTextY - zoomTextHeight / 2,
      width: zoomTextWidth,
      height: zoomTextHeight,
    };

    // Zoom in button (rightmost)
    const zoomInX = zoomTextX + zoomTextWidth / 2 + buttonGap;
    const zoomInY = zoomOutY;

    this.zoomInButtonBounds = {
      x: zoomInX,
      y: zoomInY,
      width: buttonWidth,
      height: buttonHeight,
    };

    // Check if mouse is hovering over buttons
    const isZoomOutHover = this.isPointInBounds(this.mouseX, this.mouseY, this.zoomOutButtonBounds);
    const isZoomInHover = this.isPointInBounds(this.mouseX, this.mouseY, this.zoomInButtonBounds);
    const canZoomOut = zoom > 2; // MIN_ZOOM
    const canZoomIn = zoom < 6; // MAX_ZOOM

    // Draw zoom out button
    ctx.fillStyle =
      isZoomOutHover && canZoomOut
        ? this.buttonSettings.hoverBackground
        : this.buttonSettings.background;
    ctx.fillRect(zoomOutX, zoomOutY, buttonWidth, buttonHeight);
    ctx.strokeStyle = this.buttonSettings.borderColor;
    ctx.lineWidth = this.buttonSettings.borderWidth;
    ctx.strokeRect(zoomOutX, zoomOutY, buttonWidth, buttonHeight);

    ctx.fillStyle = canZoomOut ? "white" : "rgba(255, 255, 255, 0.3)";
    ctx.font = this.buttonSettings.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("-", zoomOutX + buttonWidth / 2, zoomOutY + buttonHeight / 2);

    // Draw zoom text
    ctx.fillStyle = "white";
    ctx.fillText(zoomText, zoomTextX, zoomTextY);

    // Draw zoom in button
    ctx.fillStyle =
      isZoomInHover && canZoomIn
        ? this.buttonSettings.hoverBackground
        : this.buttonSettings.background;
    ctx.fillRect(zoomInX, zoomInY, buttonWidth, buttonHeight);
    ctx.strokeStyle = this.buttonSettings.borderColor;
    ctx.lineWidth = this.buttonSettings.borderWidth;
    ctx.strokeRect(zoomInX, zoomInY, buttonWidth, buttonHeight);

    ctx.fillStyle = canZoomIn ? "white" : "rgba(255, 255, 255, 0.3)";
    ctx.fillText("+", zoomInX + buttonWidth / 2, zoomInY + buttonHeight / 2);

    this.restoreContext(ctx);
  }

  public handleClick(x: number, y: number, canvasHeight: number): boolean {
    if (this.zoomOutButtonBounds && this.isPointInBounds(x, y, this.zoomOutButtonBounds)) {
      this.zoomController.zoomOut();
      return true;
    }

    if (this.zoomInButtonBounds && this.isPointInBounds(x, y, this.zoomInButtonBounds)) {
      this.zoomController.zoomIn();
      return true;
    }

    return false;
  }

  private isPointInBounds(
    x: number,
    y: number,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }
}
