import { Renderer } from "./renderer";

export interface WindowListener {
  cleanUp: () => void;
}

export class ResizeController implements WindowListener {
  private renderer: Renderer;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  public handleResize(): void {
    this.renderer.resizeCanvas();
  }

  public cleanUp(): void {
    window.removeEventListener("resize", this.handleResize);
  }
}
