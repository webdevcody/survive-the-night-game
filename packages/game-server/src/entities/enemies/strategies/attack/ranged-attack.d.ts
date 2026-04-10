import { BaseEnemy, AttackStrategy } from "../../base-enemy";
export declare class RangedAttackStrategy implements AttackStrategy {
    private static readonly ATTACK_RANGE;
    update(zombie: BaseEnemy, deltaTime: number): void;
}
