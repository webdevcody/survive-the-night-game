import { CameraManager } from "@/managers/camera";

export class ZoomController {
  private MIN_ZOOM: number = 2;
  private MAX_ZOOM: number = 6;
  private ZOOM_STEP: number = 0.5;

  private zoom: number = 5;
  private cameraManager: CameraManager;

  constructor(cameraManager: CameraManager) {
    this.cameraManager = cameraManager;
    this.cameraManager.setScale(this.zoom);
  }

  public getZoom(): number {
    return this.zoom;
  }

  public setZoom(zoom: number): void {
    this.zoom = zoom;
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
