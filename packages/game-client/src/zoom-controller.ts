import { CameraManager } from "@/managers/camera";
import { getConfig } from "@shared/config";

export class ZoomController {
  private MIN_ZOOM: number = 2;
  private MAX_ZOOM: number = 6;
  private ZOOM_STEP: number = 0.5;

  private zoom: number = 5;
  private cameraManager: CameraManager;

  constructor(cameraManager: CameraManager, initialZoom?: number) {
    this.cameraManager = cameraManager;

    // Calculate initial zoom based on screen resolution if not provided
    if (initialZoom === undefined) {
      this.zoom = this.calculateInitialZoom();
    } else {
      this.zoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, initialZoom));
    }

    this.cameraManager.setScale(this.zoom);
  }

  /**
   * Calculates the initial zoom level to show exactly 35 tiles across the screen.
   *
   * Formula:
   * - World width visible = viewport width / zoom
   * - We want: 35 tiles = 35 * TILE_SIZE pixels
   * - Therefore: zoom = viewport width / (35 * TILE_SIZE)
   *
   * Note: devicePixelRatio is disabled, so canvas uses 1:1 pixel mapping.
   * window.innerWidth directly represents the canvas width in pixels.
   *
   * The result is clamped between MIN_ZOOM and MAX_ZOOM to prevent extreme zoom levels.
   * The zoom is rounded to 0.1 precision to prevent sub-pixel rendering artifacts.
   */
  private calculateInitialZoom(): number {
    // Use window.innerWidth which is the canvas width (1:1 pixel mapping)
    const viewportWidth = window.innerWidth;
    const tileSize = getConfig().world.TILE_SIZE;
    const tilesToShow = 35;

    // Calculate zoom to show exactly 35 tiles across
    // zoom = viewportWidth / (tilesToShow * tileSize)
    const calculatedZoom = viewportWidth / (tilesToShow * tileSize);

    // Round to 0.1 precision to prevent sub-pixel rendering artifacts
    const roundedZoom = Math.round(calculatedZoom * 10) / 10;

    // Clamp between MIN_ZOOM and MAX_ZOOM
    return Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, roundedZoom));
  }

  public getZoom(): number {
    return this.zoom;
  }

  public setZoom(zoom: number): void {
    // Round to 0.1 precision to prevent sub-pixel rendering artifacts
    const roundedZoom = Math.round(zoom * 10) / 10;
    this.zoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, roundedZoom));
    this.cameraManager.setScale(this.zoom);
  }

  public zoomIn(): void {
    if (this.zoom < this.MAX_ZOOM) {
      this.zoom += this.ZOOM_STEP;
      this.cameraManager.setScale(this.zoom);
    }
  }

  public zoomOut(): void {
    if (this.zoom > this.MIN_ZOOM) {
      this.zoom -= this.ZOOM_STEP;
      this.cameraManager.setScale(this.zoom);
    }
  }
}
