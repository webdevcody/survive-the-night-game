import { Vector2 } from "@survive-the-night/game-server";
import { Renderable } from "../traits/renderable";
import { Entity } from "./entity";

export class Player extends Entity implements Renderable {
  private playerSize = 5;
  private position: Vector2 = { x: 0, y: 0 };

  constructor(id: string) {
    super("player", id);
  }

  render(ctx: CanvasRenderingContext2D): void {
    console.log("rendering player", this.position);
    ctx.fillStyle = "red";
    ctx.fillRect(
      this.position.x,
      this.position.y,
      this.playerSize,
      this.playerSize
    );

    ctx.fillStyle = "white";
    ctx.fillText(this.getId(), this.playerSize, this.playerSize);
  }
}
