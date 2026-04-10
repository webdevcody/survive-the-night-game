import { BaseEnemy } from "../base-enemy";
import Vector2 from "@/util/vector2";
/**
 * Calculates separation force to push zombie away from nearby zombies.
 * Uses inverse distance weighting - closer zombies have stronger repulsion.
 *
 * @param zombie The zombie to calculate separation for
 * @returns Separation velocity vector (normalized direction * strength)
 */
export declare function calculateSeparationForce(zombie: BaseEnemy): Vector2;
/**
 * Blends separation force with pathfinding velocity.
 *
 * @param pathfindingVelocity The velocity from pathfinding (towards target)
 * @param separationForce The separation force (away from nearby zombies)
 * @returns Blended velocity vector
 */
export declare function blendSeparationForce(pathfindingVelocity: Vector2, separationForce: Vector2): Vector2;
