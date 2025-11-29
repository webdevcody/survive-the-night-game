import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { velocityTowards } from "@shared/util/physics";
import { AIStateHandler, AIStateContext } from "./base-state";

/**
 * FLEE state handler - emergency escape from toxic zone
 *
 * This state is triggered when the AI is inside a toxic zone and needs to escape.
 * Unlike RETREAT, this ignores healing and enemies - pure survival movement.
 * Uses pathThroughToxic to navigate around obstacles while fleeing toward safety.
 *
 * IMPORTANT: We use pathThroughToxic instead of findWalkableWaypoint because:
 * - findWalkableWaypoint uses pathTowardsAvoidingToxic which marks toxic zones as blocked
 * - When AI is INSIDE a toxic zone, it can't path out because its starting position is "blocked"
 * - pathThroughToxic only avoids real obstacles (trees, rocks) and allows pathing through toxic areas
 */
export class FleeStateHandler implements AIStateHandler {
  handle(input: Input, playerPos: Vector2, context: AIStateContext): void {
    // Get the nearest safe position from the pathfinder
    const safePos = context.pathfinder.findNearestSafePosition(playerPos);

    if (safePos) {
      // Use pathThroughToxic to find a path that avoids trees but allows toxic zone traversal
      // This is critical because findWalkableWaypoint would fail (toxic zone = blocked)
      const waypoint = context.pathfinder.pathThroughToxic(playerPos, safePos);

      if (waypoint) {
        // Move toward the pathfound waypoint
        const vel = velocityTowards(playerPos, waypoint);
        input.dx = vel.x;
        input.dy = vel.y;
      } else {
        // Pathfinding failed - try alternative directions to escape
        // Try 8 directions and find one with a valid path
        const mapCenter = context.pathfinder.getMapCenter();
        const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];

        // First try direction toward map center
        const toCenterX = mapCenter.x - playerPos.x;
        const toCenterY = mapCenter.y - playerPos.y;
        const primaryAngle = Math.atan2(toCenterY, toCenterX);

        // Sort angles by how close they are to the direction toward map center
        const sortedAngles = [...angles].sort((a, b) => {
          const diffA = Math.abs(((a - primaryAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
          const diffB = Math.abs(((b - primaryAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
          return diffA - diffB;
        });

        let foundPath = false;
        for (const angle of sortedAngles) {
          const testTarget = new Vector2(
            playerPos.x + Math.cos(angle) * 150,
            playerPos.y + Math.sin(angle) * 150
          );
          // Use pathThroughToxic for alternative directions too
          const testWaypoint = context.pathfinder.pathThroughToxic(playerPos, testTarget);
          if (testWaypoint) {
            const vel = velocityTowards(playerPos, testWaypoint);
            input.dx = vel.x;
            input.dy = vel.y;
            foundPath = true;
            break;
          }
        }

        // If no path found at all, try moving toward map center directly as last resort
        if (!foundPath) {
          const vel = velocityTowards(playerPos, mapCenter);
          input.dx = vel.x;
          input.dy = vel.y;
        }
      }
    } else {
      // No safe position found - fall back to moving toward map center
      const mapCenter = context.pathfinder.getMapCenter();
      const waypoint = context.pathfinder.pathThroughToxic(playerPos, mapCenter);

      if (waypoint) {
        const vel = velocityTowards(playerPos, waypoint);
        input.dx = vel.x;
        input.dy = vel.y;
      } else {
        // Direct movement as last resort
        const vel = velocityTowards(playerPos, mapCenter);
        input.dx = vel.x;
        input.dy = vel.y;
      }
    }

    // Always sprint when fleeing toxic - this is life or death
    input.sprint = true;

    // Don't try to attack or use items - pure movement
    input.fire = false;
  }
}
