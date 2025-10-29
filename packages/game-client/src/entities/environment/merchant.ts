import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { MerchantShopItem } from "@shared/config/game-config";

export class MerchantClient extends ClientEntity implements Renderable {
  private shopItems: MerchantShopItem[] = [];

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);

    // Store shop items from the server
    if (data.shopItems) {
      this.shopItems = data.shopItems;
    }
  }

  public deserialize(data: RawEntity): void {
    super.deserialize(data);

    // Update shop items when received from server
    if (data.shopItems) {
      this.shopItems = data.shopItems;
    }
  }

  public getShopItems(): MerchantShopItem[] {
    return this.shopItems;
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    // Render a simple colored square as a placeholder
    // TODO: Replace with actual merchant sprite once available
    const position = this.getExt(ClientPositionable).getPosition();

    // Draw merchant body (brown)
    ctx.fillStyle = "#8B4513"; // Brown color for merchant
    ctx.fillRect(position.x, position.y, 16, 16);

    // Draw face (beige)
    ctx.fillStyle = "#FFE4C4"; // Beige for face
    ctx.fillRect(position.x + 4, position.y + 4, 8, 8);

    // Draw eyes
    ctx.fillStyle = "#000000";
    ctx.fillRect(position.x + 5, position.y + 6, 2, 2);
    ctx.fillRect(position.x + 9, position.y + 6, 2, 2);

    // Draw mouth (smile)
    ctx.fillStyle = "#000000";
    ctx.fillRect(position.x + 6, position.y + 9, 4, 1);
  }
}
