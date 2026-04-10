import { IGameManagers } from "@/managers/types";
import { Direction } from "@/util/direction";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { Rectangle } from "@/util/shape";
export declare class FlameProjectile extends Entity {
    private traveledDistance;
    private static readonly FLAME_SPEED;
    private static get FLAME_SIZE();
    private lastPosition;
    private shooterId;
    private damage;
    private maxDistance;
    constructor(gameManagers: IGameManagers, damage?: number);
    setShooterId(id: number): void;
    getShooterId(): number;
    setDirection(direction: Direction): void;
    /**
     * Set flame direction from an angle in radians with random spread
     * @param angle Angle in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
     */
    setDirectionFromAngle(angle: number): void;
    getHitbox(): Rectangle;
    private updateFlame;
    private updatePositions;
    private handleIntersections;
    private handleMaxDistanceLogic;
    private spawnFireOnGround;
    getPosition(): Vector2;
    setPosition(position: Vector2): void;
    getCenterPosition(): Vector2;
    getVelocity(): Vector2;
    setVelocity(velocity: Vector2): void;
}
