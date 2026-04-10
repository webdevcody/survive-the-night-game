import { BaseEnemy, AttackStrategy } from "../../base-enemy";
export declare class GroundSlamAttackStrategy implements AttackStrategy {
    private slamRadius;
    private slamDamage;
    private knockbackForce;
    constructor(slamRadius?: number, slamDamage?: number, knockbackForce?: number);
    update(zombie: BaseEnemy, _deltaTime: number): void;
    /**
     * Performs a ground slam attack dealing damage and knockback in a radius
     */
    performGroundSlam(zombie: BaseEnemy): void;
}
