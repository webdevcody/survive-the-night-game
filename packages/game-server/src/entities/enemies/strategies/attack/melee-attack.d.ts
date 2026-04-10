import { BaseEnemy, AttackStrategy } from "../../base-enemy";
import { IEntity } from "@/entities/types";
export declare class MeleeAttackStrategy implements AttackStrategy {
    onEntityDamaged?: (entity: IEntity) => void;
    /**
     * Calculate the shortest distance from a point to a rectangle (AABB)
     */
    private distanceToRect;
    update(zombie: BaseEnemy, _deltaTime: number): void;
}
