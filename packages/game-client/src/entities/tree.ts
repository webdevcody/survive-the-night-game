import {
  distance,
  Entities,
  Entity,
  HARVEST_DISTANCE,
  Positionable,
  Vector2,
} from "@survive-the-night/game-server";
import { getEntityById, type GameState } from "../state";
import { Renderable } from "./util";

const TREE_SIZE = 16;

export class TreeClient extends Entity implements Renderable, Positionable {
  private image = new Image();
  private position: Vector2 = { x: 0, y: 0 };

  constructor(id: string) {
    super(Entities.TREE, id);
    this.image.src = "/tree.png";
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  getCenterPosition(): Vector2 {
    return {
      x: this.position.x + TREE_SIZE / 2,
      y: this.position.y + TREE_SIZE / 2,
    };
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const myPlayer = getEntityById(gameState, gameState.playerId) as
      | Positionable
      | undefined;

    if (
      myPlayer &&
      distance(myPlayer.getPosition(), this.getPosition()) < HARVEST_DISTANCE
    ) {
      ctx.fillStyle = "white";
      ctx.font = "6px Arial";
      const text = "harvest (e)";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(
        text,
        this.getCenterPosition().x - textWidth / 2,
        this.getPosition().y - 3
      );
    }

    ctx.drawImage(this.image, this.getPosition().x, this.getPosition().y);

    // hitbox
    // const serverPosition = roundVector2(targetPosition);
    // ctx.fillStyle = "red";
    // ctx.fillRect(serverPosition.x, serverPosition.y, 10, 10);
  }
}
