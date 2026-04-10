import Positionable from "@/extensions/positionable";
import PoolManager from "@shared/util/pool-manager";
import Destructible from "@/extensions/destructible";
import Inventory from "@/extensions/inventory";
import Updatable from "@/extensions/updatable";
import { ExplosionEvent } from "../../../../game-shared/src/events/server-sent/events/explosion-event";
import { Weapon } from "@/entities/weapons/weapon";
import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import { getConfig } from "@shared/config";
import { calculateProjectileVelocity } from "@/entities/weapons/helpers";
import { distance } from "@/util/physics";
export class Grenade extends Weapon {
    constructor(gameManagers, itemState) {
        var _a;
        super(gameManagers, "grenade");
        this.velocity = PoolManager.getInstance().vector2.claim(0, 0);
        this.isArmed = false;
        this.traveledDistance = 0;
        this.targetDistance = Grenade.DEFAULT_THROW_DISTANCE;
        this.isExploded = false;
        this.interactiveExtension = null;
        this.throwerId = 0;
        // Add Updatable extension for grenade physics after it's thrown
        this.addExtension(new Updatable(this, this.updateGrenade.bind(this)));
        // Make grenades stackable by setting count from itemState or default
        if (this.hasExt(Carryable)) {
            const carryable = this.getExt(Carryable);
            const count = (_a = itemState === null || itemState === void 0 ? void 0 : itemState.count) !== null && _a !== void 0 ? _a : Grenade.DEFAULT_COUNT;
            carryable.setItemState({ count });
        }
        // Store reference to Interactive extension for removal when thrown
        if (this.hasExt(Interactive)) {
            this.interactiveExtension = this.getExt(Interactive);
            this.interactiveExtension.onInteract((entityId) => {
                const carryable = this.getExt(Carryable);
                // Use helper method to preserve count when picking up dropped grenades
                carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, Grenade.DEFAULT_COUNT));
            });
        }
    }
    getCooldown() {
        return Grenade.COOLDOWN;
    }
    attack(playerId, _position, facing, aimAngle, aimDistance) {
        var _a;
        const player = this.getEntityManager().getEntityById(playerId);
        if (!player || !player.hasExt(Positionable))
            return;
        const playerPos = player.getExt(Positionable).getCenterPosition();
        const inventory = player.getExt(Inventory);
        // Find the grenade in inventory
        const inventoryItems = inventory.getItems();
        const grenadeIndex = inventoryItems.findIndex((item) => item && item.itemType === this.getType());
        if (grenadeIndex === -1)
            return;
        const grenadeItem = inventoryItems[grenadeIndex];
        if (!grenadeItem)
            return;
        // Decrement count for stackable grenades
        const currentCount = ((_a = grenadeItem.state) === null || _a === void 0 ? void 0 : _a.count) || 1;
        if (currentCount > 1) {
            // Decrement count instead of removing
            inventory.updateItemState(grenadeIndex, { count: currentCount - 1 });
        }
        else {
            // Remove item if count reaches 0
            inventory.removeItem(grenadeIndex);
        }
        // Set grenade position to player position
        this.getExt(Positionable).setPosition(playerPos);
        // Set target distance if provided (mouse aiming), grenade will explode at crosshair position
        if (aimDistance !== undefined && !isNaN(aimDistance)) {
            this.targetDistance = aimDistance;
        }
        else {
            this.targetDistance = Grenade.DEFAULT_THROW_DISTANCE;
        }
        // Set velocity using shared utility function
        this.velocity = calculateProjectileVelocity(facing, Grenade.THROW_SPEED, aimAngle);
        // Arm the grenade
        this.isArmed = true;
        this.traveledDistance = 0;
        this.throwerId = playerId;
        // Remove Interactive extension - once thrown, grenades are "live" and cannot be picked up
        if (this.interactiveExtension) {
            this.removeExtension(this.interactiveExtension);
            this.interactiveExtension = null;
        }
        // Add to world
        this.getEntityManager().addEntity(this);
    }
    updateGrenade(deltaTime) {
        if (!this.isArmed)
            return;
        const poolManager = PoolManager.getInstance();
        const positionable = this.getExt(Positionable);
        const lastPosition = positionable.getPosition().clone();
        // Update position based on velocity (no friction - travels at constant speed like grenade launcher)
        const newPos = poolManager.vector2.claim(lastPosition.x + this.velocity.x * deltaTime, lastPosition.y + this.velocity.y * deltaTime);
        positionable.setPosition(newPos);
        // Check if grenade has reached target distance
        this.traveledDistance += distance(lastPosition, newPos);
        if (this.traveledDistance >= this.targetDistance) {
            this.explode();
        }
    }
    explode() {
        if (this.isExploded)
            return;
        this.isExploded = true;
        const position = this.getExt(Positionable).getCenterPosition();
        const nearbyEntities = this.getEntityManager().getNearbyEntities(position, Grenade.EXPLOSION_RADIUS);
        // Use game mode strategy to determine valid targets
        const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
        // Damage valid targets in explosion radius
        for (const entity of nearbyEntities) {
            if (!entity.hasExt(Destructible))
                continue;
            // Use strategy to determine if this entity should be damaged
            if (!strategy.shouldDamageTarget(this, entity, this.throwerId)) {
                continue;
            }
            const entityPos = entity.getExt(Positionable).getCenterPosition();
            const dist = distance(position, entityPos);
            if (dist <= Grenade.EXPLOSION_RADIUS) {
                // Scale damage based on distance from explosion
                const damageScale = 1 - dist / Grenade.EXPLOSION_RADIUS;
                const damage = Math.ceil(Grenade.EXPLOSION_DAMAGE * damageScale);
                entity.getExt(Destructible).damage(damage, this.throwerId);
            }
        }
        // Broadcast explosion event for client to show particle effect
        this.getEntityManager().getBroadcaster().broadcastEvent(new ExplosionEvent({
            position,
        }));
        // Remove the grenade
        this.getEntityManager().markEntityForRemoval(this);
    }
}
Grenade.EXPLOSION_RADIUS = getConfig().combat.EXPLOSION_RADIUS_MEDIUM;
Grenade.EXPLOSION_DAMAGE = getConfig().combat.EXPLOSION_DAMAGE_STANDARD;
Grenade.THROW_SPEED = getConfig().combat.THROW_SPEED;
Grenade.DEFAULT_THROW_DISTANCE = getConfig().combat.TRAVEL_DISTANCE_MEDIUM;
Grenade.COOLDOWN = getConfig().combat.THROWABLE_COOLDOWN;
Grenade.DEFAULT_COUNT = 1;
