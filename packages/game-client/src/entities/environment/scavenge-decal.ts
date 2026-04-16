import type { RawEntity } from "@shared/types/entity";
import type { AssetManager } from "@/managers/asset";
import { ClientEntity } from "@/entities/client-entity";
import type { Renderable } from "@/entities/util";
import { Z_INDEX } from "@shared/map";
import type { GameState } from "@/state";

export class ScavengeDecalClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.DECALS;
  }

  /** True when the server allows another scavenge (see serialized `nextLootAt`). */
  public isLootReady(): boolean {
    const t = (this as unknown as { nextLootAt?: number }).nextLootAt;
    return !(typeof t === "number" && t > Date.now());
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
  }

  protected renderInteractionText(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.isLootReady()) {
      return;
    }
    super.renderInteractionText(ctx, gameState);
  }
}
