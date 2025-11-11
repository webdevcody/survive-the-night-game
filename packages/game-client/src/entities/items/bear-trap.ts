import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { ClientEntity } from "@/entities/client-entity";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";

export class BearTrapClient extends ClientEntity implements Renderable {
  private isArmed = true;
  private snaredZombieId: string | null = null;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const image = this.imageLoader.get("bear_trap");

    // Draw the bear trap
    // If disarmed, draw it darker or with a different visual state
    if (!this.isArmed) {
      ctx.save();
      ctx.filter = "brightness(70%)";
    }
    ctx.drawImage(image, position.x, position.y);
    if (!this.isArmed) {
      ctx.restore();
    }
  }

  public deserialize(data: RawEntity): void {
    super.deserialize(data);
    this.isArmed = data.isArmed ?? true;
    this.snaredZombieId = data.snaredZombieId ?? null;
  }
}
