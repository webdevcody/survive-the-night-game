import { IGameManagers } from "@/managers/types";
import { Direction } from "@/util/direction";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { Rectangle } from "@/util/shape";
export declare class Bullet extends Entity {
    private traveledDistance;
    private static readonly BULLET_SPEED;
    private lastPosition;
    private shooterId;
    private damage;
    constructor(gameManagers: IGameManagers, damage?: number);
    setShooterId(id: number): void;
    getShooterId(): number;
    setDirection(direction: Direction): void;
    setDirectionWithOffset(direction: Direction, offsetAngle: number): void;
    getHitbox(): Rectangle;
    setDirectionFromVelocity(velocity: Vector2): void;
    /**
     * Set bullet direction from an angle in radians
     * @param angle Angle in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
     */
    setDirectionFromAngle(angle: number): void;
    private updateBullet;
    private updatePositions;
    private handleIntersections;
    private handleMaxDistanceLogic;
    getPosition(): Vector2;
    setPosition(position: Vector2): void;
    getCenterPosition(): Vector2;
    getVelocity(): Vector2;
    setVelocity(velocity: Vector2): void;
}
