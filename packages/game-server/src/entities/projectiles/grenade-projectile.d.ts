import { IGameManagers } from "@/managers/types";
import { Direction } from "@/util/direction";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
export declare class GrenadeProjectile extends Entity {
    private traveledDistance;
    private targetDistance;
    private startPosition;
    private shooterId;
    constructor(gameManagers: IGameManagers);
    setShooterId(id: number): void;
    getShooterId(): number;
    /**
     * Set the target distance for the grenade (where it will explode)
     * @param distance Distance in world units from the starting position
     */
    setTargetDistance(distance: number): void;
    setDirection(direction: Direction): void;
    /**
     * Set grenade direction from an angle in radians
     * @param angle Angle in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
     */
    setDirectionFromAngle(angle: number): void;
    setPosition(position: Vector2): void;
    private updateGrenadeProjectile;
    private explode;
    getPosition(): Vector2;
    getVelocity(): Vector2;
}
