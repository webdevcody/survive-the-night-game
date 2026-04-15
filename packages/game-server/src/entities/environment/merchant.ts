import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import Collidable from "@/extensions/collidable";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getConfig, type MerchantShopItem } from "@shared/config";
import {
  MERCHANT_FOOTPRINT_TILES_H,
  MERCHANT_FOOTPRINT_TILES_W,
} from "@shared/map/merchant-footprint";
import { SerializableFields } from "@/util/serializable-fields";
import Illuminated from "@/extensions/illuminated";

export class Merchant extends Entity {
  public static get Size(): Vector2 {
    const t = getConfig().world.TILE_SIZE;
    return PoolManager.getInstance().vector2.claim(
      MERCHANT_FOOTPRINT_TILES_W * t,
      MERCHANT_FOOTPRINT_TILES_H * t,
    );
  }

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.MERCHANT);

    // Initialize serializable fields
    this.serialized = new SerializableFields({ shopItems: [] }, () => this.markEntityDirty());
    const poolManager = PoolManager.getInstance();
    const tile = getConfig().world.TILE_SIZE;
    const pw = MERCHANT_FOOTPRINT_TILES_W * tile;
    const ph = MERCHANT_FOOTPRINT_TILES_H * tile;
    const size = poolManager.vector2.claim(pw, ph);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Collidable(this)
        .setSize(poolManager.vector2.claim(pw, ph))
        .setOffset(poolManager.vector2.claim(0, 0)),
    );
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("buy")
    );
    this.addExtension(new Illuminated(this, getConfig().world.LIGHT_RADIUS_FIRE));

    // Initialize with all buyable items
    this.initializeShopItems();
  }

  private interact(entityId: number): void {
    // When player interacts, they will see the shop UI on the client
    // The shop items are already serialized and sent to the client
  }

  /**
   * Initialize shop items with all buyable items (no randomization)
   */
  public initializeShopItems(): void {
    const shopItems = [...getConfig().merchant.SHOP_ITEMS];
    this.serialized.set("shopItems", shopItems);
  }

  /** Replace stock from authored map data (already validated on load). */
  public applyAuthoredShopItems(items: MerchantShopItem[]): void {
    this.serialized.set(
      "shopItems",
      items.map((x) => ({
        itemType: String(x.itemType),
        price: Math.max(0, Math.floor(Number(x.price))),
      })),
    );
  }

  public getShopItems(): MerchantShopItem[] {
    return this.serialized.get("shopItems");
  }

  setPosition(position: Vector2): void {
    this.getExt(Positionable).setPosition(position);
  }
}
