import { Renderable } from "../traits/renderable";
import { Player } from "@survive-the-night/game-server";
export class PlayerClient extends Player implements Renderable {
  private playerSize = 5;

  constructor(id: string) {
    super(id);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "red";
    ctx.fillRect(
      this.getPosition().x,
      this.getPosition().y,
      this.playerSize,
      this.playerSize
    );

    ctx.fillStyle = "white";
    ctx.fillText(this.getId(), this.playerSize, this.playerSize);
  }
}
