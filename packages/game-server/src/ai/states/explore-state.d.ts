import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { AIStateHandler, AIStateContext } from "./base-state";
/**
 * EXPLORE state handler - wander around
 */
export declare class ExploreStateHandler implements AIStateHandler {
    handle(input: Input, playerPos: Vector2, context: AIStateContext): void;
}
