import { Entity } from "@/entities/entity";
import { Entities, Zombies } from "../../../../game-shared/src/constants";
import { getConfig } from "@shared/config";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import Carryable from "@/extensions/carryable";
import Placeable from "@/extensions/placeable";
import { distance } from "../../../../game-shared/src/util/physics";
import Destructible from "@/extensions/destructible";
import OneTimeTrigger from "@/extensions/one-time-trigger";
import PoolManager from "@shared/util/pool-manager";
import { ExplosionEvent } from "../../../../game-shared/src/events/server-sent/events/explosion-event";
import { Cooldown } from "../util/cooldown";
import Updatable from "@/extensions/updatable";
import { SerializableFields } from "@/util/serializable-fields";
/**
 * A landmine that explodes when enemies step on it, damaging all nearby enemies
 */
export class Landmine extends Entity {
    static get SIZE() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers, itemState) {
        var _a;
        super(gameManagers, Entities.LANDMINE);
        // Initialize serializable fields
        this.serialized = new SerializableFields({ isActive: false }, () => this.markEntityDirty());
        this.untilActive = new Cooldown(getConfig().trap.LANDMINE_ACTIVATION_DELAY);
        const count = (_a = itemState === null || itemState === void 0 ? void 0 : itemState.count) !== null && _a !== void 0 ? _a : Landmine.DEFAULT_COUNT;
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Interactive(this)
            .onInteract((entityId) => this.interact(entityId))
            .setDisplayName("landmine"));
        this.addExtension(new Carryable(this, "landmine").setItemState({ count }));
        this.addExtension(new Placeable(this));
        this.addExtension(new Updatable(this, this.updateLandmine.bind(this)));
    }
    setIsActive(value) {
        const currentIsActive = this.serialized.get('isActive');
        if (currentIsActive !== value) {
            this.serialized.set('isActive', value);
        }
    }
    activate() {
        this.setIsActive(true);
        this.addExtension(new OneTimeTrigger(this, {
            triggerRadius: Landmine.TRIGGER_RADIUS,
            targetTypes: Zombies,
            includePlayersInBattleRoyale: true, // Allow targeting other players in Battle Royale
        }).onTrigger(() => this.explode()));
    }
    updateLandmine(deltaTime) {
        this.untilActive.update(deltaTime);
        const isActive = this.serialized.get('isActive');
        if (this.untilActive.isReady() && !isActive) {
            this.activate();
        }
    }
    explode() {
        const position = this.getExt(Positionable).getCenterPosition();
        const nearbyEntities = this.getEntityManager().getNearbyEntities(this.getExt(Positionable).getPosition(), getConfig().combat.LANDMINE_EXPLOSION_RADIUS);
        // Get owner ID to exclude
        const ownerId = this.hasExt(Placeable) ? this.getExt(Placeable).getOwnerId() : null;
        // Damage all things in explosion radius (except the owner)
        for (const entity of nearbyEntities) {
            if (!entity.hasExt(Destructible))
                continue;
            // Skip the owner
            if (ownerId !== null && entity.getId() === ownerId)
                continue;
            const entityPos = entity.getExt(Positionable).getPosition();
            const dist = distance(position, entityPos);
            if (dist <= getConfig().combat.LANDMINE_EXPLOSION_RADIUS) {
                entity.getExt(Destructible).damage(getConfig().trap.LANDMINE_DAMAGE);
            }
        }
        this.getEntityManager().getBroadcaster().broadcastEvent(new ExplosionEvent({
            position,
        }));
        // Remove the landmine after explosion
        this.getEntityManager().markEntityForRemoval(this);
    }
    interact(entityId) {
        const entity = this.getEntityManager().getEntityById(entityId);
        if (!entity || entity.getType() !== Entities.PLAYER)
            return;
        const carryable = this.getExt(Carryable);
        // Use helper method to preserve count when picking up dropped landmines
        carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, Landmine.DEFAULT_COUNT));
    }
}
Landmine.TRIGGER_RADIUS = getConfig().combat.ITEM_TRIGGER_RADIUS;
Landmine.DEFAULT_COUNT = 1;
