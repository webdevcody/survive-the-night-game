import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ImageLoader } from "@/managers/asset";
import { RawEntity } from "../../../../game-shared/src/types/entity";
import { GameState } from "@/state";
import { ClientPositionable } from "@/extensions";
import { LANDMINE_EXPLOSION_RADIUS } from "@shared/constants/constants";

export class LandmineClient extends ClientEntity implements Renderable {
  private isActive = false;

  constructor(data: RawEntity, imageLoader: ImageLoader) {
    super(data, imageLoader);
  }

  public getZIndex(): number {
    return 0;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const position = this.getExt(ClientPositionable).getCenterPosition();
    const image = this.imageLoader.get("landmine");

    if (!this.isActive) {
      ctx.save();
      ctx.filter = "brightness(50%)";
    }
    ctx.drawImage(image, position.x - image.width / 2, position.y - image.height / 2);
    if (!this.isActive) {
      ctx.restore();
    }

    if (this.isActive) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(position.x, position.y, LANDMINE_EXPLOSION_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  public deserialize(data: RawEntity): void {
    super.deserialize(data);
    this.isActive = data.isActive;
  }
}
