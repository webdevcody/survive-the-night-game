import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { AIStateHandler, AIStateContext } from "./base-state";

/**
 * EXPLORE state handler - wander around
 */
export class ExploreStateHandler implements AIStateHandler {
  handle(input: Input, playerPos: Vector2, context: AIStateContext): void {
    context.moveTowardWaypoint(input, playerPos);
    // Walk, don't sprint while exploring
  }
}


