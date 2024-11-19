import { Renderable } from "../traits/renderable";
import { Player, roundVector2 } from "@survive-the-night/game-server";
export class PlayerClient extends Player implements Renderable {
  private playerSize = 5;

  constructor(id: string) {
    super(id);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const position = roundVector2(this.getPosition());

    ctx.fillStyle = "red";
    ctx.fillRect(position.x, position.y, this.playerSize, this.playerSize);

    ctx.fillStyle = "white";
    ctx.fillText(this.getId(), position.x, position.y);
  }
}
