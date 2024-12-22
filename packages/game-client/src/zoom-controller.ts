import { CameraManager } from "./managers/camera";
import { StorageManager } from "./managers/storage";

export class ZoomController {
  private MIN_ZOOM: number = 2;
  private MAX_ZOOM: number = 6;
  private ZOOM_STEP: number = 0.5;

  private zoom: number = 4;
  private storageManager: StorageManager;
  private cameraManager: CameraManager;

  constructor(storageManager: StorageManager, cameraManager: CameraManager) {
    this.storageManager = storageManager;
    this.cameraManager = cameraManager;
    this.zoom = this.storageManager.getScale(4);
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
      this.storageManager.setScale(this.zoom);
      this.cameraManager.setScale(this.zoom);
    }
  }

  public zoomOut(): void {
    if (this.zoom > this.MIN_ZOOM) {
      this.zoom -= this.ZOOM_STEP;
      this.storageManager.setScale(this.zoom);
      this.cameraManager.setScale(this.zoom);
    }
  }
}
