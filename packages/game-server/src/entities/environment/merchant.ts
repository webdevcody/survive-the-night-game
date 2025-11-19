import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getConfig, type MerchantShopItem } from "@shared/config";
import { SerializableFields } from "@/util/serializable-fields";

export class Merchant extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.MERCHANT);

    // Initialize serializable fields
    this.serialized = new SerializableFields({ shopItems: [] }, () => this.markEntityDirty());
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("buy")
    );

    // Initialize with 3 random items
    this.randomizeShopItems();
  }

  private interact(entityId: number): void {
    // When player interacts, they will see the shop UI on the client
    // The shop items are already serialized and sent to the client
  }

  /**
   * Randomizes the 3 shop items from the available merchant items
   */
  public randomizeShopItems(): void {
    const serialized = this.serialized as any;
    const availableItems = [...getConfig().merchant.SHOP_ITEMS];
    serialized.shopItems = [];

    // Pick 3 random items
    for (let i = 0; i < 3 && availableItems.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableItems.length);
      serialized.shopItems.push(availableItems[randomIndex]);
      availableItems.splice(randomIndex, 1);
    }
  }

  public getShopItems(): MerchantShopItem[] {
    const serialized = this.serialized as any;
    return serialized.shopItems;
  }

  setPosition(position: Vector2): void {
    this.getExt(Positionable).setPosition(position);
  }
}
