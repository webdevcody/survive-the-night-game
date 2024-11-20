import { Renderable } from "../traits/renderable";
import { Player, roundVector2 } from "@survive-the-night/game-server";
export class PlayerClient extends Player implements Renderable {
  private image = new Image();
  private lastRenderPosition = { x: 0, y: 0 };
  private readonly LERP_FACTOR = 0.1;

  constructor(id: string) {
    super(id);
    this.image.src = "/player.png";
  }

  render(ctx: CanvasRenderingContext2D): void {
    const targetPosition = this.getPosition();

    this.lastRenderPosition.x += (targetPosition.x - this.lastRenderPosition.x) * this.LERP_FACTOR;
    this.lastRenderPosition.y += (targetPosition.y - this.lastRenderPosition.y) * this.LERP_FACTOR;

    const renderPosition = roundVector2(this.lastRenderPosition);

    ctx.drawImage(this.image, renderPosition.x, renderPosition.y);

    // hitbox
    // const serverPosition = roundVector2(targetPosition);
    // ctx.fillStyle = "red";
    // ctx.fillRect(serverPosition.x, serverPosition.y, 10, 10);
  }
}
