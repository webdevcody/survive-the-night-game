import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { velocityTowards } from "@shared/util/physics";
import { AIStateHandler, AIStateContext } from "./base-state";
import { AI_CONFIG } from "../ai-config";
import { AIInteractionHelper } from "../ai-interaction-helper";

/**
 * RETREAT state handler - flee and heal
 */
export class RetreatStateHandler implements AIStateHandler {
  handle(input: Input, playerPos: Vector2, context: AIStateContext): void {
    const inventory = context.player.getInventory();
    const hasBandage = inventory.some((item) => item && item.itemType === "bandage");

    // If we don't have a bandage, actively look for one
    if (!hasBandage) {
      const bandageTarget = context.targetingSystem.findNearestBandage(context.player);

      if (bandageTarget && bandageTarget.distance && bandageTarget.distance < AI_CONFIG.RETREAT_PICKUP_RADIUS) {
        if (
          bandageTarget.distance <= AI_CONFIG.INTERACT_RADIUS &&
          context.interactTimer >= AI_CONFIG.INTERACT_COOLDOWN &&
          bandageTarget.entity
        ) {
          // Use helper to attempt pickup (handles inventory checks and debug logging)
          const result = AIInteractionHelper.tryPickupItem(
            context.player,
            bandageTarget.entity,
            context.targetingSystem,
            "RETREAT"
          );

          if (result.success) {
            context.resetInteractTimer();
          }
          // Clear target regardless of success (either picked up or can't pick up)
          context.setCurrentTarget(null);

          // If we couldn't pick up due to full inventory, don't keep trying
          if (!result.success) {
            return;
          }
        } else {
          // Not close enough - pathfind to the bandage
          if (
            !context.currentTarget ||
            context.currentTarget.type !== "item" ||
            context.currentTarget.entity?.getId() !== bandageTarget.entity?.getId()
          ) {
            context.setCurrentTarget(bandageTarget);
            context.setCurrentWaypoint(null);
            context.recalculatePath();
          }

          // Move toward bandage using pathfinding ONLY
          if (context.currentWaypoint) {
            const vel = velocityTowards(playerPos, context.currentWaypoint);
            input.dx = vel.x;
            input.dy = vel.y;
          } else {
            context.recalculatePath();
            if (context.currentWaypoint) {
              const vel = velocityTowards(playerPos, context.currentWaypoint);
              input.dx = vel.x;
              input.dy = vel.y;
            } else {
              // Pathfinding failed - try to retreat toward map center (safe from toxic)
              // Don't use direct movement which could walk into obstacles/toxic
              const mapCenter = context.pathfinder.getMapCenter();
              const centerWaypoint = context.findWalkableWaypoint(playerPos, mapCenter);
              if (centerWaypoint) {
                context.setCurrentWaypoint(centerWaypoint);
                const vel = velocityTowards(playerPos, centerWaypoint);
                input.dx = vel.x;
                input.dy = vel.y;
              }
              // If even map center fails, don't move - better than walking into toxic
            }
          }

          input.sprint = context.shouldSprint(true);

          // Try to use any bandage we already have while moving (only if not at full health)
          this.tryUseBandage(input, context);
          return;
        }
      }
    }

    // No bandage to find, or already have one - focus on retreating
    const movedToWaypoint = context.moveTowardWaypoint(input, playerPos);

    // If no waypoint movement (reached or null), find a new retreat direction
    if (!movedToWaypoint) {
      context.setCurrentTarget(context.targetingSystem.findSafeRetreatPosition(context.player));
      context.setCurrentWaypoint(null);
      context.recalculatePath();

      if (!context.currentWaypoint) {
        const safestDir = context.enhancedThreatInfo?.safestRetreatDirection;
        if (safestDir) {
          const retreatTarget = new Vector2(
            playerPos.x + safestDir.x * 300,
            playerPos.y + safestDir.y * 300
          );
          const retreatWaypoint = context.findWalkableWaypoint(playerPos, retreatTarget);
          if (retreatWaypoint) {
            context.setCurrentWaypoint(retreatWaypoint);
            context.setCurrentTarget({
              type: "position",
              position: retreatTarget,
              priority: AI_CONFIG.PRIORITY_HEALTH_URGENT,
            });
            const vel = velocityTowards(playerPos, retreatWaypoint);
            input.dx = vel.x;
            input.dy = vel.y;
          } else {
            this.findRandomWalkableDirection(input, playerPos, context);
          }
        } else {
          this.findRandomWalkableDirection(input, playerPos, context);
        }
      } else {
        const vel = velocityTowards(playerPos, context.currentWaypoint);
        input.dx = vel.x;
        input.dy = vel.y;
      }
    }

    input.sprint = context.shouldSprint(true);

    // Try to use bandage if we have one and need healing
    if (hasBandage) {
      this.tryUseBandage(input, context);
    }
  }

  /**
   * Try to equip and use a bandage if player needs healing
   */
  private tryUseBandage(input: Input, context: AIStateContext): void {
    const currentHealth = context.player.getHealth();
    const maxHealth = context.player.getMaxHealth();

    if (currentHealth >= maxHealth) {
      return; // No healing needed
    }

    const inventory = context.player.getInventory();
    const activeItem = context.player.activeItem;

    // Equip bandage if not already equipped
    if (activeItem?.itemType !== "bandage") {
      const bandageIndex = context.stateMachine.getBandageIndex(inventory);
      if (bandageIndex >= 0) {
        context.player.selectInventoryItem(bandageIndex + 1);
      }
    }

    // Use bandage if equipped
    const currentActiveItem = context.player.activeItem;
    if (currentActiveItem?.itemType === "bandage") {
      input.fire = true;
    }
  }

  /**
   * Find a random walkable direction and set movement
   * ALWAYS uses A* pathfinding - never direct movement
   */
  private findRandomWalkableDirection(
    input: Input,
    playerPos: Vector2,
    context: AIStateContext
  ): void {
    // Try multiple random directions until we find one with a valid path
    for (let attempt = 0; attempt < 12; attempt++) {
      const randomAngle = Math.random() * Math.PI * 2;
      const randomTarget = new Vector2(
        playerPos.x + Math.cos(randomAngle) * 200,
        playerPos.y + Math.sin(randomAngle) * 200
      );

      const randomWaypoint = context.findWalkableWaypoint(playerPos, randomTarget);
      if (randomWaypoint) {
        context.setCurrentWaypoint(randomWaypoint);
        const vel = velocityTowards(playerPos, randomWaypoint);
        input.dx = vel.x;
        input.dy = vel.y;
        return;
      }
    }

    // All random directions failed - try map center as ultimate fallback
    // Map center is always safe from toxic gas in battle royale
    const mapCenter = context.pathfinder.getMapCenter();
    const centerWaypoint = context.findWalkableWaypoint(playerPos, mapCenter);
    if (centerWaypoint) {
      context.setCurrentWaypoint(centerWaypoint);
      const vel = velocityTowards(playerPos, centerWaypoint);
      input.dx = vel.x;
      input.dy = vel.y;
      return;
    }

    // Even map center failed - we're completely stuck
    // Don't move at all rather than walking into obstacles/toxic
    // This should be very rare - pathfinding usually finds a way
    input.dx = 0;
    input.dy = 0;
  }
}
