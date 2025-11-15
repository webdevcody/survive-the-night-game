import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";

export class CoinClient extends ClientEntity implements Renderable {
  private static readonly BOUNCE_HEIGHT = 8; // Maximum bounce height in pixels
  private static readonly BOUNCE_SPEED = 0.004; // Speed of the bounce cycle

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const image = this.getImage();
    const position = this.getExt(ClientPositionable).getPosition();

    // Calculate bounce offset using an exponential easing function
    // This creates a bouncy effect where it falls quickly and bounces back
    const time = Date.now();
    const cycle = (time * CoinClient.BOUNCE_SPEED) % (Math.PI * 2); // Loop the animation

    // Use abs(sin) to create a bouncing motion (always positive)
    // Then apply an exponential curve to make it snappier
    const sinValue = Math.abs(Math.sin(cycle));
    const bounceOffset = -Math.pow(sinValue, 2) * CoinClient.BOUNCE_HEIGHT; // Negative to bounce up

    // Draw coin with vertical bounce offset
    ctx.drawImage(image, position.x, position.y + bounceOffset);
  }
}
