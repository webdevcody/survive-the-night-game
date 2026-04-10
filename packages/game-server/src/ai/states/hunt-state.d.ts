import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { AIStateHandler, AIStateContext } from "./base-state";
/**
 * HUNT state handler - search for players and attack
 */
export declare class HuntStateHandler implements AIStateHandler {
    handle(input: Input, playerPos: Vector2, context: AIStateContext): void;
}
