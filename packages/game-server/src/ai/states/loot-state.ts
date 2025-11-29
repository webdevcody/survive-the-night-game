import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { distance } from "@shared/util/physics";
import { AIStateHandler, AIStateContext } from "./base-state";
import { AI_CONFIG } from "../ai-config";
import { AIInteractionHelper } from "../ai-interaction-helper";
import { equipMeleeWeaponForCrate, aimAtTarget } from "../ai-utils";

/**
 * LOOT state handler - collect items
 */
export class LootStateHandler implements AIStateHandler {
  handle(input: Input, playerPos: Vector2, context: AIStateContext): void {
    if (!context.currentTarget) {
      context.moveTowardWaypoint(input, playerPos);
      return;
    }

    const targetPos = context.currentTarget.position;
    const dist = distance(playerPos, targetPos);

    // If we're within interaction range, stop moving and wait for cooldown
    if (dist <= AI_CONFIG.INTERACT_RADIUS) {
      // Stop moving - we're close enough, just wait for cooldown
      input.dx = 0;
      input.dy = 0;

      // Check if cooldown is ready to interact
      if (context.interactTimer >= AI_CONFIG.INTERACT_COOLDOWN) {
        context.resetInteractTimer();

        // Verify entity still exists
        if (context.currentTarget.entity && context.currentTarget.entity.isMarkedForRemoval()) {
          context.setCurrentTarget(null);
          return;
        }

        if (context.currentTarget.type === "crate") {
          // Attack crate to break it - prioritize using knife
          const inventory = context.player.getInventory();
          equipMeleeWeaponForCrate(context.player, inventory, context.stateMachine);

          aimAtTarget(input, playerPos, targetPos);
          input.fire = true;
        } else if (context.currentTarget.type === "barrel") {
          // Search barrel using helper
          const result = AIInteractionHelper.tryInteractWithBarrel(
            context.player,
            context.currentTarget.entity
          );
          // Always clear target after attempting barrel interaction
          context.setCurrentTarget(null);
        } else if (context.currentTarget.type === "item") {
          // Pick up item using helper
          const result = AIInteractionHelper.tryPickupItem(
            context.player,
            context.currentTarget.entity,
            context.targetingSystem,
            "LOOT"
          );
          // Always clear target after attempting pickup (whether success or fail)
          context.setCurrentTarget(null);
        }
      }

      // Stop moving when in range (waiting for cooldown or just interacted)
      return;
    }

    // Only move if we're NOT within interaction range
    context.moveTowardWaypoint(input, playerPos);
  }
}
