import { Cooldown } from "@/entities/util/cooldown";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { Entity } from "@/entities/entity";
import { LootEvent } from "../../../../game-shared/src/events/server-sent/events/loot-event";
import PoolManager from "@shared/util/pool-manager";
import { ZombieDeathEvent } from "../../../../game-shared/src/events/server-sent/events/zombie-death-event";
import { ZombieHurtEvent } from "../../../../game-shared/src/events/server-sent/events/zombie-hurt-event";
import { EntityCategories, zombieRegistry } from "@shared/entities";
import { getConfig } from "@shared/config";
import { balanceConfig } from "@shared/config/balance-config";
import { Blood } from "@/entities/effects/blood";
import { distance, normalizeVector, pathTowards, velocityTowards } from "@/util/physics";
import { gameEventBus } from "@/services/game-event-bus";
import Snared from "@/extensions/snared";
import { ZombieAlertedEvent } from "../../../../game-shared/src/events/server-sent/events/zombie-alerted-event";
import { calculateSeparationForce, blendSeparationForce } from "./strategies/separation";
import { SerializableFields } from "@/util/serializable-fields";
import { Entities } from "@/constants";
export class BaseEnemy extends Entity {
    constructor(gameManagers, entityType, config) {
        super(gameManagers, entityType);
        // Internal state (not serialized)
        this.currentWaypoint = null;
        this.pathRecalculationTimer = 0;
        this.hasBeenLooted = false;
        /**
         * Spawn-anchored patrol + chase leash (all enemies).
         * Anchor is set on first live update from the zombie’s center (or via setSpawnAnchor after placement).
         * Patrol: wander inside wanderRadius; if outside, path home. Chase starts when a player is within
         * activationRadius of the zombie; ends when the closest player is farther than maxPlayerDistanceFromSpawn
         * from the anchor. See entityConfig ZOMBIE_LEASH_* and optional ZombieConfig.leash overrides.
         */
        this.spawnAnchor = null;
        this.isLeashChasing = false;
        this.leashPlayerCheckTimer = Math.random() * getConfig().entity.PLAYER_CHECK_INTERVAL;
        this.leashPathRecalcTimer = Math.random() * getConfig().entity.PATH_RECALCULATION_INTERVAL;
        this.leashWaypoint = null;
        this.leashWanderTimer = Math.random() * getConfig().entity.ZOMBIE_LEASH_WANDER_PAUSE_DURATION;
        this.leashWanderDirection = null;
        this.leashWanderMoving = false;
        this.maimRemainingSeconds = 0;
        this.maimSpeedMultiplier = 1;
        // Initialize serializable fields
        this.serialized = new SerializableFields({ debugWaypoint: null }, () => this.markEntityDirty());
        // Get config from registry if not provided
        this.config = config || zombieRegistry.get(entityType);
        if (!this.config) {
            throw new Error(`Zombie config not found for ${entityType}`);
        }
        this.speed = this.config.stats.speed;
        this.entityType = entityType;
        this.attackCooldown = new Cooldown(this.config.stats.attackCooldown);
        // Offset attack cooldown randomly to prevent all zombies from attacking simultaneously
        // This spreads out expensive entity queries across time
        const randomOffset = Math.random() * this.config.stats.attackCooldown;
        this.attackCooldown.setTimeRemaining(randomOffset);
        this.attackRadius = this.config.stats.attackRadius;
        this.attackDamage = this.config.stats.damage;
        // Apply global multiplier to reduce zombie item drop chance
        const adjustedDropChance = this.config.stats.dropChance * balanceConfig.ZOMBIE_ITEM_DROP_MULTIPLIER;
        this.addExtension(new Inventory(this, gameManagers.getBroadcaster()).addRandomItem(adjustedDropChance, this.config.dropTable));
        this.addExtension(new Destructible(this)
            .setMaxHealth(this.config.stats.health)
            .setHealth(this.config.stats.health)
            .onDamaged(this.onDamaged.bind(this))
            .setOffset(PoolManager.getInstance().vector2.claim(0, 0))
            .onDeath(this.onDeath.bind(this)));
        this.addExtension(new Groupable(this, "enemy"));
        this.addExtension(new Positionable(this).setSize(this.config.stats.size));
        this.addExtension(new Collidable(this)
            .setSize(this.config.stats.size.clone().div(2))
            .setOffset(PoolManager.getInstance().vector2.claim(4, 4)));
        this.addExtension(new Movable(this));
        this.addExtension(new Updatable(this, this.updateEnemy.bind(this)));
    }
    setMovementStrategy(strategy) {
        this.movementStrategy = strategy;
    }
    setAttackStrategy(strategy) {
        this.attackStrategy = strategy;
    }
    /** Override the auto-captured spawn anchor (e.g. debug spawns after setPosition). */
    setSpawnAnchor(position) {
        this.spawnAnchor = position.clone();
    }
    setCurrentWaypoint(waypoint) {
        this.currentWaypoint = waypoint;
        this.serialized.set("debugWaypoint", waypoint);
    }
    ensureSpawnAnchor() {
        if (this.spawnAnchor !== null) {
            return;
        }
        this.spawnAnchor = this.getCenterPosition().clone();
    }
    resolveLeashParams() {
        var _a, _b, _c, _d, _e, _f, _g;
        const e = getConfig().entity;
        const o = this.config.leash;
        return {
            wanderRadius: (_a = o === null || o === void 0 ? void 0 : o.wanderRadius) !== null && _a !== void 0 ? _a : e.ZOMBIE_LEASH_WANDER_RADIUS,
            maxPlayerDistanceFromSpawn: (_b = o === null || o === void 0 ? void 0 : o.maxPlayerDistanceFromSpawn) !== null && _b !== void 0 ? _b : e.ZOMBIE_LEASH_MAX_PLAYER_DISTANCE_FROM_SPAWN,
            activationRadius: (_c = o === null || o === void 0 ? void 0 : o.activationRadius) !== null && _c !== void 0 ? _c : e.IDLE_ACTIVATION_RADIUS,
            wanderMoveDuration: (_d = o === null || o === void 0 ? void 0 : o.wanderMoveDuration) !== null && _d !== void 0 ? _d : e.ZOMBIE_LEASH_WANDER_MOVE_DURATION,
            wanderPauseDuration: (_e = o === null || o === void 0 ? void 0 : o.wanderPauseDuration) !== null && _e !== void 0 ? _e : e.ZOMBIE_LEASH_WANDER_PAUSE_DURATION,
            wanderSpeed: (_f = o === null || o === void 0 ? void 0 : o.wanderSpeed) !== null && _f !== void 0 ? _f : e.ZOMBIE_LEASH_WANDER_SPEED,
            wanderLookahead: (_g = o === null || o === void 0 ? void 0 : o.wanderLookahead) !== null && _g !== void 0 ? _g : e.ZOMBIE_LEASH_WANDER_LOOKAHEAD,
        };
    }
    isFlyingEnemy() {
        return (this.config.movementStrategy === "flying" || this.config.movementStrategy === "cross-dive");
    }
    resetLeashPatrolMotion() {
        this.leashWaypoint = null;
        this.leashPathRecalcTimer = 0;
        this.leashWanderMoving = false;
        this.leashWanderTimer = 0;
        this.leashWanderDirection = null;
    }
    applyMaim(durationSeconds, speedMultiplier) {
        this.maimRemainingSeconds = Math.max(this.maimRemainingSeconds, Math.max(0, durationSeconds));
        this.maimSpeedMultiplier = Math.min(this.maimSpeedMultiplier, Math.max(0, speedMultiplier));
    }
    getClosestAggroCandidate(searchRadius) {
        if (!Number.isFinite(searchRadius) || searchRadius <= 0 || !this.spawnAnchor) {
            return null;
        }
        const zombiePos = this.getCenterPosition();
        const nearbyPlayers = this
            .getEntityManager()
            .getNearbyEntities(zombiePos, searchRadius, new Set([Entities.PLAYER]));
        let closest = null;
        for (const entity of nearbyPlayers) {
            if (!(entity instanceof Entity) || !entity.hasExt(Positionable) || !entity.hasExt(Destructible)) {
                continue;
            }
            if (entity.getExt(Destructible).isDead()) {
                continue;
            }
            const playerLike = entity;
            const detectionMultiplier = typeof playerLike.getZombieDetectionRadiusMultiplier === "function"
                ? playerLike.getZombieDetectionRadiusMultiplier()
                : 1;
            if (detectionMultiplier <= 0) {
                continue;
            }
            const playerPos = entity.getExt(Positionable).getCenterPosition();
            const distanceToZombie = distance(zombiePos, playerPos);
            if (distanceToZombie > searchRadius * detectionMultiplier) {
                continue;
            }
            const distanceToAnchor = distance(playerPos, this.spawnAnchor);
            if (!closest || distanceToZombie < closest.distanceToZombie) {
                closest = { entity, distanceToZombie, distanceToAnchor };
            }
        }
        return closest;
    }
    updateLeashChasingState(deltaTime, params) {
        this.leashPlayerCheckTimer += deltaTime;
        if (this.leashPlayerCheckTimer < getConfig().entity.PLAYER_CHECK_INTERVAL) {
            return;
        }
        this.leashPlayerCheckTimer = 0;
        if (!this.spawnAnchor) {
            return;
        }
        const prev = this.isLeashChasing;
        if (this.isLeashChasing) {
            const closestAlivePlayer = this.getEntityManager().getClosestAlivePlayer(this);
            if (!closestAlivePlayer || !closestAlivePlayer.hasExt(Positionable)) {
                this.isLeashChasing = false;
            }
            else {
                const playerPos = closestAlivePlayer.getExt(Positionable).getCenterPosition();
                const distanceToAnchor = distance(playerPos, this.spawnAnchor);
                if (distanceToAnchor > params.maxPlayerDistanceFromSpawn) {
                    this.isLeashChasing = false;
                }
            }
        }
        else {
            const player = this.getClosestAggroCandidate(params.activationRadius);
            this.isLeashChasing = player != null;
        }
        if (!prev && this.isLeashChasing) {
            this.resetLeashPatrolMotion();
            const zPos = this.getCenterPosition();
            this.getGameManagers()
                .getBroadcaster()
                .broadcastEvent(new ZombieAlertedEvent(this.getId(), { x: zPos.x, y: zPos.y }));
        }
        if (prev && !this.isLeashChasing) {
            this.leashWaypoint = null;
            this.leashPathRecalcTimer = 0;
        }
    }
    /**
     * Patrol target for pathfinding / direct flight: spawn when outside wander disc, random wander
     * lookahead when inside, or null when paused between wander legs.
     */
    computeLeashPatrolTarget(deltaTime, zombiePos, anchor, params) {
        const distFromAnchor = distance(zombiePos, anchor);
        if (distFromAnchor > params.wanderRadius) {
            return anchor.clone();
        }
        this.leashWanderTimer += deltaTime;
        if (this.leashWanderMoving) {
            if (this.leashWanderTimer >= params.wanderMoveDuration) {
                this.leashWanderMoving = false;
                this.leashWanderTimer = 0;
                this.leashWanderDirection = null;
                return null;
            }
            if (!this.leashWanderDirection) {
                return null;
            }
            const poolManager = PoolManager.getInstance();
            const lookahead = params.wanderLookahead;
            const t = poolManager.vector2.claim(zombiePos.x + this.leashWanderDirection.x * lookahead, zombiePos.y + this.leashWanderDirection.y * lookahead);
            const d = distance(t, anchor);
            if (d > params.wanderRadius) {
                const scale = params.wanderRadius / d;
                t.x = anchor.x + (t.x - anchor.x) * scale;
                t.y = anchor.y + (t.y - anchor.y) * scale;
            }
            const out = t.clone();
            poolManager.vector2.release(t);
            return out;
        }
        if (this.leashWanderTimer >= params.wanderPauseDuration) {
            this.leashWanderMoving = true;
            this.leashWanderTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const poolManager = PoolManager.getInstance();
            const raw = poolManager.vector2.claim(Math.cos(angle), Math.sin(angle));
            this.leashWanderDirection = normalizeVector(raw);
            poolManager.vector2.release(raw);
        }
        return null;
    }
    applySpawnLeashBehavior(deltaTime) {
        this.ensureSpawnAnchor();
        const params = this.resolveLeashParams();
        const zombiePos = this.getCenterPosition();
        const anchor = this.spawnAnchor;
        this.updateLeashChasingState(deltaTime, params);
        if (this.hasExt(Snared)) {
            const poolManager = PoolManager.getInstance();
            this.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
            return "patrol_ground";
        }
        if (this.isLeashChasing) {
            return "chasing";
        }
        const patrolTarget = this.computeLeashPatrolTarget(deltaTime, zombiePos, anchor, params);
        const mapManager = this.getGameManagers().getMapManager();
        if (this.isFlyingEnemy()) {
            const movable = this.getExt(Movable);
            const poolManager = PoolManager.getInstance();
            if (!patrolTarget) {
                movable.setVelocity(poolManager.vector2.claim(0, 0));
                return "patrol_air";
            }
            const pathfindingVelocity = velocityTowards(zombiePos.clone(), patrolTarget.clone());
            const pathfindingVelScaled = poolManager.vector2.claim(pathfindingVelocity.x * params.wanderSpeed, pathfindingVelocity.y * params.wanderSpeed);
            const separationForce = calculateSeparationForce(this);
            const finalVelocity = blendSeparationForce(pathfindingVelScaled, separationForce);
            movable.setVelocity(finalVelocity);
            poolManager.vector2.release(pathfindingVelScaled);
            poolManager.vector2.release(separationForce);
            poolManager.vector2.release(finalVelocity);
            const position = this.getPosition();
            position.x += movable.getVelocity().x * deltaTime;
            position.y += movable.getVelocity().y * deltaTime;
            this.setPosition(position);
            return "patrol_air";
        }
        if (!patrolTarget) {
            const poolManager = PoolManager.getInstance();
            this.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
            this.leashWaypoint = null;
            return "patrol_ground";
        }
        this.leashPathRecalcTimer += deltaTime;
        const waypointThreshold = getConfig().entity.WAYPOINT_REACHED_THRESHOLD;
        const distWaypoint = this.leashWaypoint
            ? zombiePos.clone().sub(this.leashWaypoint).length()
            : Infinity;
        const needNewWaypoint = !this.leashWaypoint ||
            distWaypoint <= waypointThreshold ||
            this.leashPathRecalcTimer >= getConfig().entity.PATH_RECALCULATION_INTERVAL;
        if (needNewWaypoint) {
            this.leashWaypoint = pathTowards(zombiePos.clone(), patrolTarget.clone(), mapManager.getGroundLayer(), mapManager.getCollidablesLayer());
            this.leashPathRecalcTimer = 0;
        }
        if (this.leashWaypoint) {
            const pathfindingVelocity = velocityTowards(zombiePos.clone(), this.leashWaypoint.clone());
            const poolManager = PoolManager.getInstance();
            const pathfindingVelScaled = poolManager.vector2.claim(pathfindingVelocity.x * params.wanderSpeed, pathfindingVelocity.y * params.wanderSpeed);
            const separationForce = calculateSeparationForce(this);
            const finalVelocity = blendSeparationForce(pathfindingVelScaled, separationForce);
            this.getExt(Movable).setVelocity(finalVelocity);
            poolManager.vector2.release(pathfindingVelScaled);
            poolManager.vector2.release(separationForce);
            poolManager.vector2.release(finalVelocity);
        }
        else {
            const poolManager = PoolManager.getInstance();
            this.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
        }
        return "patrol_ground";
    }
    onDamaged() {
        this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieHurtEvent(this.getId()));
        // Create blood entity at zombie position
        const position = this.getExt(Positionable).getPosition();
        const blood = new Blood(this.getGameManagers());
        blood.getExt(Positionable).setPosition(position);
        this.getEntityManager().addEntity(blood);
    }
    getCenterPosition() {
        const poolManager = PoolManager.getInstance();
        const positionable = this.getExt(Positionable);
        const size = positionable.getSize();
        const position = positionable.getPosition();
        const rect = poolManager.rectangle.claim(position, size);
        const center = rect.center;
        poolManager.rectangle.release(rect);
        return center;
    }
    getHitbox() {
        const collidable = this.getExt(Collidable);
        return collidable.getHitBox();
    }
    onDeath(killerId) {
        this.getExt(Collidable).setEnabled(false);
        this.addExtension(new Interactive(this).onInteract(() => this.onLooted()).setDisplayName("loot"));
        this.getGameManagers()
            .getBroadcaster()
            .broadcastEvent(new ZombieDeathEvent(this.getId(), killerId || 0));
        // Emit internal event for kill tracking (decoupled from HTTP/API logic)
        if (killerId) {
            gameEventBus.emitZombieKilled({
                zombieEntityId: this.getId(),
                killerEntityId: killerId,
                enemyType: this.getType(),
                timestamp: Date.now(),
            });
        }
        // Mark entity for removal if not looted
        this.getEntityManager().markEntityForRemoval(this, getConfig().entity.ENTITY_DESPAWN_TIME_MS);
    }
    onLooted() {
        // Prevent multiple loots
        if (this.hasBeenLooted) {
            return;
        }
        this.hasBeenLooted = true;
        const inventory = this.getExt(Inventory);
        if (inventory) {
            inventory.scatterItems(this.getPosition());
        }
        this.getEntityManager().markEntityForRemoval(this);
        this.getGameManagers().getBroadcaster().broadcastEvent(new LootEvent(this.getId()));
    }
    getPosition() {
        const positionable = this.getExt(Positionable);
        const position = positionable.getPosition();
        return position;
    }
    setPosition(position) {
        const positionable = this.getExt(Positionable);
        positionable.setPosition(position);
    }
    handleMovement(deltaTime) {
        const position = this.getPosition();
        const previousX = position.x;
        const previousY = position.y;
        const movable = this.getExt(Movable);
        const velocity = movable.getVelocity();
        position.x += velocity.x * deltaTime;
        this.setPosition(position);
        if (this.getEntityManager().isColliding(this)) {
            position.x = previousX;
            this.setPosition(position);
        }
        position.y += velocity.y * deltaTime;
        this.setPosition(position);
        if (this.getEntityManager().isColliding(this)) {
            position.y = previousY;
            this.setPosition(position);
        }
    }
    isAtWaypoint() {
        if (!this.currentWaypoint)
            return true;
        const dx = Math.abs(this.getCenterPosition().x - this.currentWaypoint.x);
        const dy = Math.abs(this.getCenterPosition().y - this.currentWaypoint.y);
        return dx <= BaseEnemy.POSITION_THRESHOLD && dy <= BaseEnemy.POSITION_THRESHOLD;
    }
    updateEnemy(deltaTime) {
        // Get performance tracker for detailed analytics
        const entityManager = this.getEntityManager();
        const tickPerformanceTracker = entityManager.tickPerformanceTracker;
        // Track cooldown updates
        const endCooldownUpdates = (tickPerformanceTracker === null || tickPerformanceTracker === void 0 ? void 0 : tickPerformanceTracker.startMethod("cooldownUpdates", "updateEnemy")) || (() => { });
        this.attackCooldown.update(deltaTime);
        this.pathRecalculationTimer += deltaTime;
        if (this.maimRemainingSeconds > 0) {
            this.maimRemainingSeconds = Math.max(0, this.maimRemainingSeconds - deltaTime);
            if (this.maimRemainingSeconds <= 0) {
                this.maimSpeedMultiplier = 1;
            }
        }
        endCooldownUpdates();
        const destructible = this.getExt(Destructible);
        if (destructible.isDead()) {
            return;
        }
        // Spawn leash + patrol, or delegate to movement strategy when chasing
        const endMovementStrategy = (tickPerformanceTracker === null || tickPerformanceTracker === void 0 ? void 0 : tickPerformanceTracker.startMethod("movementStrategy", "updateEnemy")) || (() => { });
        let handledMovement = false;
        const leashMode = this.applySpawnLeashBehavior(deltaTime);
        if (leashMode === "chasing") {
            if (this.movementStrategy) {
                handledMovement = this.movementStrategy.update(this, deltaTime);
            }
            if (!handledMovement) {
                this.handleMovement(deltaTime);
            }
        }
        else if (leashMode === "patrol_ground") {
            this.handleMovement(deltaTime);
        }
        endMovementStrategy();
        const endHandleMovement = (tickPerformanceTracker === null || tickPerformanceTracker === void 0 ? void 0 : tickPerformanceTracker.startMethod("handleMovement", "updateEnemy")) || (() => { });
        endHandleMovement();
        const endAttackStrategy = (tickPerformanceTracker === null || tickPerformanceTracker === void 0 ? void 0 : tickPerformanceTracker.startMethod("attackStrategy", "updateEnemy")) || (() => { });
        if (this.attackStrategy) {
            let shouldRunAttack = this.isLeashChasing;
            if (!shouldRunAttack) {
                const quickPlayerCheck = (tickPerformanceTracker === null || tickPerformanceTracker === void 0 ? void 0 : tickPerformanceTracker.startMethod("quickPlayerCheck", "attackStrategy")) || (() => { });
                const player = this.getClosestAggroCandidate(getConfig().combat.ZOMBIE_ATTACK_RADIUS + 100);
                quickPlayerCheck();
                if (player) {
                    const maxAttackRange = getConfig().combat.ZOMBIE_ATTACK_RADIUS + 100;
                    shouldRunAttack = player.distanceToZombie <= maxAttackRange;
                }
            }
            if (shouldRunAttack) {
                this.attackStrategy.update(this, deltaTime);
            }
        }
        endAttackStrategy();
    }
    getAttackCooldown() {
        return this.attackCooldown;
    }
    getAttackDamage() {
        return this.attackDamage;
    }
    getSpeed() {
        return this.speed * this.maimSpeedMultiplier;
    }
    getCategory() {
        return EntityCategories.ZOMBIE;
    }
}
BaseEnemy.POSITION_THRESHOLD = 1;
BaseEnemy.PATH_RECALCULATION_INTERVAL = 1; // 1 second
