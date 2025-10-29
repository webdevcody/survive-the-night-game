import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { RawEntity } from "@shared/types/entity";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { MERCHANT_SHOP_ITEMS, MerchantShopItem } from "@shared/config/game-config";

export class Merchant extends Entity {
  public static readonly Size = new Vector2(16, 16);
  private shopItems: MerchantShopItem[] = [];

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.MERCHANT);

    this.extensions = [
      new Positionable(this).setSize(Merchant.Size),
      new Interactive(this)
        .onInteract(this.interact.bind(this))
        .setDisplayName("buy"),
    ];

    // Initialize with 3 random items
    this.randomizeShopItems();
  }

  private interact(entityId: string): void {
    // When player interacts, they will see the shop UI on the client
    // The shop items are already serialized and sent to the client
  }

  /**
   * Randomizes the 3 shop items from the available merchant items
   */
  public randomizeShopItems(): void {
    const availableItems = [...MERCHANT_SHOP_ITEMS];
    this.shopItems = [];

    // Pick 3 random items
    for (let i = 0; i < 3 && availableItems.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableItems.length);
      this.shopItems.push(availableItems[randomIndex]);
      availableItems.splice(randomIndex, 1);
    }
  }

  public getShopItems(): MerchantShopItem[] {
    return this.shopItems;
  }

  setPosition(position: Vector2): void {
    this.getExt(Positionable).setPosition(position);
  }

  serialize(): RawEntity {
    const serialized = {
      ...super.serialize(),
      position: this.getExt(Positionable).getPosition(),
      shopItems: this.shopItems,
    };
    return serialized;
  }
}
