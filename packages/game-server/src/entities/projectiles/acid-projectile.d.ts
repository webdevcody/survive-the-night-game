import { IGameManagers } from "@/managers/types";
import Vector2 from "@/util/vector2";
import { Entity } from "@/entities/entity";
export declare class AcidProjectile extends Entity {
    private static readonly PROJECTILE_SPEED;
    private static get PROJECTILE_SIZE();
    private static readonly PROJECTILE_DAMAGE;
    private static readonly MAX_DISTANCE;
    private readonly startPosition;
    constructor(gameManagers: IGameManagers, startPosition: Vector2, targetPosition: Vector2);
    private update;
}
