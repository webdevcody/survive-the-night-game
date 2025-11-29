import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { distance } from "@shared/util/physics";
import { AIStateHandler, AIStateContext } from "./base-state";
import { AI_CONFIG } from "../ai-config";
import Positionable from "@/extensions/positionable";
import { getEffectiveShootingRange, aimAtTarget, aimAtTargetWithInaccuracy } from "../ai-utils";

/**
 * HUNT state handler - search for players and attack
 */
export class HuntStateHandler implements AIStateHandler {
  handle(input: Input, playerPos: Vector2, context: AIStateContext): void {
    // If we have a player target in range, shoot at them
    if (context.currentTarget?.type === "player" && context.currentTarget.entity) {
      const enemy = context.currentTarget.entity;
      if (enemy.hasExt(Positionable)) {
        const enemyPos = enemy.getExt(Positionable).getCenterPosition();
        const dist = distance(playerPos, enemyPos);

        // Get weapon range
        const activeItem = context.player.activeItem;
        const weaponType = activeItem?.itemType || "pistol";
        const effectiveRange = getEffectiveShootingRange(weaponType);

        // Always aim at target
        aimAtTarget(input, playerPos, enemyPos);

        if (dist <= effectiveRange) {
          // In range - shoot
          if (context.fireTimer >= AI_CONFIG.FIRE_RATE_DELAY) {
            aimAtTargetWithInaccuracy(input, playerPos, enemyPos, AI_CONFIG.SHOOTING_INACCURACY);
            input.fire = true;
          }

          // Stop to shoot if close enough
          if (dist <= AI_CONFIG.STOP_DISTANCE_FOR_SHOOTING) {
            return; // Don't move, just shoot
          }
        }
      }
    }

    // Move toward target/waypoint
    context.moveTowardWaypoint(input, playerPos);
    // Hunting is not urgent - conserve stamina for combat
    input.sprint = context.shouldSprint(false);
  }
}
