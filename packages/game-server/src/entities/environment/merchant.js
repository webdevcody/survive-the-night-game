import { Entities } from "@shared/constants";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@shared/config";
import { SerializableFields } from "@/util/serializable-fields";
import Illuminated from "@/extensions/illuminated";
export class Merchant extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers) {
        super(gameManagers, Entities.MERCHANT);
        // Initialize serializable fields
        this.serialized = new SerializableFields({ shopItems: [] }, () => this.markEntityDirty());
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("buy"));
        this.addExtension(new Illuminated(this, getConfig().world.LIGHT_RADIUS_FIRE));
        // Initialize with all buyable items
        this.initializeShopItems();
    }
    interact(entityId) {
        // When player interacts, they will see the shop UI on the client
        // The shop items are already serialized and sent to the client
    }
    /**
     * Initialize shop items with all buyable items (no randomization)
     */
    initializeShopItems() {
        const shopItems = [...getConfig().merchant.SHOP_ITEMS];
        this.serialized.set("shopItems", shopItems);
    }
    getShopItems() {
        return this.serialized.get("shopItems");
    }
    setPosition(position) {
        this.getExt(Positionable).setPosition(position);
    }
}
