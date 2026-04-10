import Vector2 from "@shared/util/vector2";
import { velocityTowards } from "@shared/util/physics";
import { getConfig } from "@shared/config";
import { AI_CONFIG, WEAPON_RANGES } from "./ai-config";
import { Direction } from "@/util/direction";
import { getWeaponLoadoutSlotKey, weaponLoadoutSlotKeyToIndex, } from "@shared/util/weapon-loadout";
/**
 * AI Utility Functions - Common logic extracted to DRY up the codebase
 */
/**
 * Assign loadout slots to a bag index and activate the matching loadout (primary vs melee).
 */
export function equipBagSlotViaLoadout(player, bagIndex1Based) {
    const inv = player.getInventory();
    const item = inv[bagIndex1Based - 1];
    if (!item)
        return;
    const key = getWeaponLoadoutSlotKey(item.itemType);
    if (!key)
        return;
    const slot = weaponLoadoutSlotKeyToIndex(key);
    player.assignWeaponLoadoutSlot(slot, bagIndex1Based);
    player.selectWeaponLoadout(slot);
}
/**
 * Get the effective shooting range for a weapon
 * Takes into account both weapon range and bullet travel distance
 * Bullets can only travel TRAVEL_DISTANCE_MEDIUM (100px), so we use the minimum
 */
export function getEffectiveShootingRange(weaponType) {
    const weaponRange = weaponType ? WEAPON_RANGES[weaponType] || 200 : 200;
    const bulletMaxTravel = getConfig().combat.TRAVEL_DISTANCE_MEDIUM;
    // Use the minimum of weapon range and bullet travel distance
    return Math.min(weaponRange, bulletMaxTravel);
}
/**
 * Get the actual melee attack range for the current weapon
 * Returns the configured range for knife/bat, or default MELEE_RANGE
 */
export function getMeleeAttackRange(activeItem) {
    if ((activeItem === null || activeItem === void 0 ? void 0 : activeItem.itemType) === "knife") {
        return getConfig().combat.KNIFE_ATTACK_RANGE;
    }
    else if ((activeItem === null || activeItem === void 0 ? void 0 : activeItem.itemType) === "baseball_bat") {
        return getConfig().combat.BASEBALL_BAT_ATTACK_RANGE;
    }
    return AI_CONFIG.MELEE_RANGE;
}
/**
 * Get melee range with a small buffer to account for movement during attack animation
 */
export function getMeleeRangeWithBuffer(activeItem) {
    return getMeleeAttackRange(activeItem) + 2;
}
/**
 * Calculate a retreat position away from an enemy
 */
export function calculateRetreatPosition(playerPos, enemyPos, dist) {
    const awayDir = velocityTowards(enemyPos, playerPos);
    return new Vector2(playerPos.x + awayDir.x * dist, playerPos.y + awayDir.y * dist);
}
/**
 * Move toward a waypoint using pathfinding
 * Returns true if movement was generated, false if waypoint was null or reached
 */
export function moveTowardWaypoint(input, playerPos, currentWaypoint, waypointThreshold = AI_CONFIG.WAYPOINT_THRESHOLD) {
    if (!currentWaypoint)
        return false;
    const dist = velocityTowards(playerPos, currentWaypoint);
    const distance = Math.sqrt(dist.x * dist.x + dist.y * dist.y);
    // Check if we've reached the waypoint
    if (distance < waypointThreshold) {
        return false; // Waypoint reached
    }
    input.dx = dist.x;
    input.dy = dist.y;
    return true;
}
/**
 * Move toward a waypoint with automatic path recalculation if reached
 * Returns true if movement was generated, false otherwise
 */
export function moveTowardWaypointWithRecalc(input, playerPos, currentWaypoint, recalculatePath, getNewWaypoint, waypointThreshold = AI_CONFIG.WAYPOINT_THRESHOLD) {
    if (!currentWaypoint) {
        recalculatePath();
        const newWaypoint = getNewWaypoint();
        if (newWaypoint) {
            const velocity = velocityTowards(playerPos, newWaypoint);
            input.dx = velocity.x;
            input.dy = velocity.y;
            return true;
        }
        return false;
    }
    const dist = velocityTowards(playerPos, currentWaypoint);
    const distance = Math.sqrt(dist.x * dist.x + dist.y * dist.y);
    // Check if we've reached the waypoint
    if (distance < waypointThreshold) {
        recalculatePath();
        const newWaypoint = getNewWaypoint();
        if (newWaypoint) {
            const velocity = velocityTowards(playerPos, newWaypoint);
            input.dx = velocity.x;
            input.dy = velocity.y;
            return true;
        }
        return false;
    }
    input.dx = dist.x;
    input.dy = dist.y;
    return true;
}
/**
 * Move toward a retreat target using pathfinding
 * Handles the common pattern of calculating retreat position, finding waypoint, and moving
 */
export function moveTowardRetreatTarget(input, playerPos, enemyPos, retreatDistance, pathfinder, safestRetreatDirection = null, currentWaypoint = null) {
    // Calculate retreat target position
    let retreatTarget;
    if (safestRetreatDirection) {
        retreatTarget = new Vector2(playerPos.x + safestRetreatDirection.x * retreatDistance, playerPos.y + safestRetreatDirection.y * retreatDistance);
    }
    else {
        retreatTarget = calculateRetreatPosition(playerPos, enemyPos, retreatDistance);
    }
    // Find walkable waypoint using pathfinding
    const retreatWaypoint = pathfinder.pathTowardsAvoidingToxic(playerPos, retreatTarget);
    if (retreatWaypoint) {
        const vel = velocityTowards(playerPos, retreatWaypoint);
        input.dx = vel.x;
        input.dy = vel.y;
        return retreatWaypoint;
    }
    // Fallback to current waypoint if available
    if (currentWaypoint) {
        const vel = velocityTowards(playerPos, currentWaypoint);
        input.dx = vel.x;
        input.dy = vel.y;
        return currentWaypoint;
    }
    return null;
}
/**
 * Move toward a retreat target with fallback path recalculation
 * More robust version that tries to recalculate path if initial attempt fails
 */
export function moveTowardRetreatTargetWithFallback(input, playerPos, enemyPos, retreatDistance, pathfinder, safestRetreatDirection = null, currentWaypoint = null, recalculatePath, getNewWaypoint) {
    const waypoint = moveTowardRetreatTarget(input, playerPos, enemyPos, retreatDistance, pathfinder, safestRetreatDirection, currentWaypoint);
    if (!waypoint) {
        // No path found - try to recalculate
        recalculatePath();
        const newWaypoint = getNewWaypoint();
        if (newWaypoint) {
            const vel = velocityTowards(playerPos, newWaypoint);
            input.dx = vel.x;
            input.dy = vel.y;
        }
        // If still no waypoint, don't move (better than running into obstacles)
    }
}
/**
 * Equip best melee weapon for crate destruction
 * Prioritizes knife, falls back to best available weapon
 */
export function equipMeleeWeaponForCrate(player, inventory, stateMachine) {
    const knifeIndex = inventory.findIndex((item) => item && item.itemType === "knife");
    if (knifeIndex >= 0) {
        player.assignWeaponLoadoutSlot(2, knifeIndex + 1);
        player.selectWeaponLoadout(2);
    }
    else {
        const weaponIndex = stateMachine.getBestWeaponIndex(inventory);
        if (weaponIndex > 0) {
            equipBagSlotViaLoadout(player, weaponIndex);
        }
    }
}
/**
 * Calculate aim angle from source to target
 */
export function calculateAimAngle(source, target) {
    return Math.atan2(target.y - source.y, target.x - source.x);
}
/**
 * Convert angle to direction (for facing)
 */
export function angleToDirection(angle) {
    const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (normalized < Math.PI / 4 || normalized >= (7 * Math.PI) / 4) {
        return Direction.Right;
    }
    else if (normalized < (3 * Math.PI) / 4) {
        return Direction.Down;
    }
    else if (normalized < (5 * Math.PI) / 4) {
        return Direction.Left;
    }
    else {
        return Direction.Up;
    }
}
/**
 * Set aim and facing direction toward a target position
 */
export function aimAtTarget(input, playerPos, targetPos) {
    const aimAngle = calculateAimAngle(playerPos, targetPos);
    input.aimAngle = aimAngle;
    input.facing = angleToDirection(aimAngle);
}
/**
 * Set aim and facing direction toward a target with inaccuracy
 */
export function aimAtTargetWithInaccuracy(input, playerPos, targetPos, inaccuracy) {
    const baseAngle = calculateAimAngle(playerPos, targetPos);
    const inaccuracyOffset = (Math.random() - 0.5) * inaccuracy;
    input.aimAngle = baseAngle + inaccuracyOffset;
    input.facing = angleToDirection(baseAngle);
}
