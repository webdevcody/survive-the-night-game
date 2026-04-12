import { IGameManagers } from "@/managers/types";
import { Cooldown } from "@/entities/util/cooldown";
import { Entity } from "@/entities/entity";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { EntityType } from "@shared/types/entity";
import { EntityCategory, ZombieConfig } from "@shared/entities";
export interface MovementStrategy {
    update(zombie: BaseEnemy, deltaTime: number): boolean;
}
export interface AttackStrategy {
    update(zombie: BaseEnemy, deltaTime: number): void;
}
export declare abstract class BaseEnemy extends Entity {
    protected currentWaypoint: Vector2 | null;
    protected attackCooldown: Cooldown;
    protected pathRecalculationTimer: number;
    protected static readonly POSITION_THRESHOLD = 1;
    protected static readonly PATH_RECALCULATION_INTERVAL = 1;
    protected speed: number;
    protected entityType: EntityType;
    protected attackRadius: number;
    protected attackDamage: number;
    private movementStrategy?;
    private attackStrategy?;
    protected config: ZombieConfig;
    private hasBeenLooted;
    /**
     * Spawn-anchored patrol + chase leash (all enemies).
     * Anchor is set on first live update from the zombie’s center (or via setSpawnAnchor after placement).
     * Patrol: wander inside wanderRadius; if outside, path home. Chase starts when a player is within
     * activationRadius of the zombie; ends when the closest player is farther than maxPlayerDistanceFromSpawn
     * from the anchor. See entityConfig ZOMBIE_LEASH_* and optional ZombieConfig.leash overrides.
     */
    private spawnAnchor;
    private isLeashChasing;
    private leashPlayerCheckTimer;
    private leashPathRecalcTimer;
    private leashWaypoint;
    private leashWanderTimer;
    private leashWanderDirection;
    private leashWanderMoving;
    private maimRemainingSeconds;
    private maimSpeedMultiplier;
    constructor(gameManagers: IGameManagers, entityType: EntityType, config?: ZombieConfig);
    setMovementStrategy(strategy: MovementStrategy): void;
    setAttackStrategy(strategy: AttackStrategy): void;
    /** Override the auto-captured spawn anchor (e.g. debug spawns after setPosition). */
    setSpawnAnchor(position: Vector2): void;
    protected setCurrentWaypoint(waypoint: Vector2 | null): void;
    private ensureSpawnAnchor;
    private resolveLeashParams;
    private isFlyingEnemy;
    private resetLeashPatrolMotion;
    applyMaim(durationSeconds: number, speedMultiplier: number): void;
    private getClosestAggroCandidate;
    private updateLeashChasingState;
    /**
     * Patrol target for pathfinding / direct flight: spawn when outside wander disc, random wander
     * lookahead when inside, or null when paused between wander legs.
     */
    private computeLeashPatrolTarget;
    private applySpawnLeashBehavior;
    onDamaged(): void;
    getCenterPosition(): Vector2;
    getHitbox(): Rectangle;
    onDeath(killerId?: number): void;
    onLooted(): void;
    getPosition(): Vector2;
    setPosition(position: Vector2): void;
    handleMovement(deltaTime: number): void;
    protected isAtWaypoint(): boolean;
    protected updateEnemy(deltaTime: number): void;
    getAttackCooldown(): Cooldown;
    getAttackDamage(): number;
    getSpeed(): number;
    getCategory(): EntityCategory;
}
