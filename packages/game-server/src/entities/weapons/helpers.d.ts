import { Direction } from "@/util/direction";
import { ItemType } from "@shared/util/inventory";
import { IEntity } from "../types";
import { IEntityManager, IGameManagers } from "@/managers/types";
import Vector2 from "@/util/vector2";
import Inventory from "@/extensions/inventory";
export declare function knockBack(entityManager: IEntityManager, entity: IEntity, facing: Direction, distance: number): void;
/**
 * Attempts to consume one unit of ammo from the player's inventory.
 * Returns true if ammo was successfully consumed, false otherwise.
 */
export declare function consumeAmmo(inventory: Inventory, ammoType: string): boolean;
export declare function countAmmoInInventory(inventory: Inventory, ammoType: ItemType): number;
export declare function consumeAmmoCount(inventory: Inventory, ammoType: ItemType, amount: number): number;
/**
 * Calculate velocity vector from an aim angle (radians) and speed.
 * @param aimAngle Angle in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
 * @param speed The speed/magnitude of the velocity
 * @returns A new Vector2 representing the velocity
 */
export declare function calculateVelocityFromAngle(aimAngle: number, speed: number): Vector2;
/**
 * Calculate velocity vector from a facing direction and speed.
 * @param facing The cardinal direction
 * @param speed The speed/magnitude of the velocity
 * @returns A new Vector2 representing the velocity
 */
export declare function calculateVelocityFromDirection(facing: Direction, speed: number): Vector2;
/**
 * Calculate velocity vector from either an aim angle or facing direction.
 * Prefers aimAngle if provided, otherwise uses facing direction.
 * @param facing The cardinal direction (fallback)
 * @param speed The speed/magnitude of the velocity
 * @param aimAngle Optional angle in radians (preferred if provided)
 * @returns A new Vector2 representing the velocity
 */
export declare function calculateProjectileVelocity(facing: Direction, speed: number, aimAngle?: number): Vector2;
/**
 * Configuration for a melee attack
 */
export interface MeleeAttackConfig {
    /** The entity manager for finding nearby entities */
    entityManager: IEntityManager;
    /** The game managers for broadcasting events */
    gameManagers: IGameManagers;
    /** The attacker's ID */
    attackerId: number;
    /** The attacker's center position */
    position: Vector2;
    /** The facing direction (used if aimAngle is not provided) */
    facing: Direction;
    /** Optional aim angle in radians (preferred over facing if provided) */
    aimAngle?: number;
    /** The attack range in pixels */
    attackRange: number;
    /** The damage to deal */
    damage: number;
    /** Optional knockback distance */
    knockbackDistance?: number;
    /** The weapon key for the attack event (e.g., "knife") */
    weaponKey: string;
    /** Custom target filter function - return true if entity is a valid target */
    targetFilter: (entity: IEntity, attackerId: number) => boolean;
    /** Optional callback when a target is hit */
    onHit?: (target: IEntity, attacker: IEntity | null) => void;
}
/**
 * Get the attack direction from an aim angle or facing direction.
 * @param facing The facing direction (fallback)
 * @param aimAngle Optional aim angle in radians
 * @returns The attack direction
 */
export declare function getAttackDirection(facing: Direction, aimAngle?: number): Direction;
/**
 * Check if a target is in the attack direction from the attacker's position.
 * @param attackerPos The attacker's position
 * @param targetPos The target's position
 * @param attackDirection The direction of the attack
 * @returns true if the target is in the attack direction
 */
export declare function isTargetInDirection(attackerPos: Vector2, targetPos: Vector2, attackDirection: Direction): boolean;
/**
 * Find the closest valid target for a melee attack.
 * @param config The melee attack configuration
 * @param attackDirection The attack direction
 * @returns The closest valid target, or null if none found
 */
export declare function findMeleeTarget(config: MeleeAttackConfig, attackDirection: Direction): IEntity | null;
/**
 * Perform a melee attack with the given configuration.
 * Handles finding targets, dealing damage, knockback, kill tracking, and broadcasting events.
 * @param config The melee attack configuration
 * @returns true if a target was hit, false otherwise
 */
export declare function performMeleeAttack(config: MeleeAttackConfig): boolean;
