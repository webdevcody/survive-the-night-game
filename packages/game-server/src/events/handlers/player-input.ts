import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { Input } from "@shared/util/input";
import { SocketEventHandler } from "./types";
import { Direction } from "@shared/util/direction";

/**
 * Validate and sanitize player input
 * Returns null if input is invalid
 */
function validateInput(input: unknown): Input | null {
  // Check if input is an object
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const obj = input as Record<string, unknown>;

  // Validate facing - must be a valid Direction enum value
  const facing = obj.facing;
  if (typeof facing !== "number" || !Object.values(Direction).includes(facing)) {
    return null;
  }

  // Validate dx - must be a number, clamp to valid range
  const dx = obj.dx;
  if (typeof dx !== "number" || !Number.isFinite(dx)) {
    return null;
  }

  // Validate dy - must be a number, clamp to valid range
  const dy = obj.dy;
  if (typeof dy !== "number" || !Number.isFinite(dy)) {
    return null;
  }

  // Validate fire - must be a boolean
  const fire = obj.fire;
  if (typeof fire !== "boolean") {
    return null;
  }

  // Validate sprint - must be a boolean
  const sprint = obj.sprint;
  if (typeof sprint !== "boolean") {
    return null;
  }

  // Validate aimAngle - optional, but if present must be a finite number
  const aimAngle = obj.aimAngle;
  if (aimAngle !== undefined && (typeof aimAngle !== "number" || !Number.isFinite(aimAngle))) {
    return null;
  }

  // Return sanitized input with clamped values
  return {
    facing: facing as Direction,
    dx: Math.max(-1, Math.min(1, dx)), // Clamp to -1 to 1
    dy: Math.max(-1, Math.min(1, dy)), // Clamp to -1 to 1
    fire,
    sprint,
    aimAngle: aimAngle !== undefined ? (aimAngle as number) : undefined,
  };
}

export function onPlayerInput(context: HandlerContext, socket: ISocketAdapter, input: unknown): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  // Validate input
  const validatedInput = validateInput(input);
  if (!validatedInput) {
    console.warn(`Invalid player input from socket ${socket.id}`);
    return;
  }

  player.setInput(validatedInput);
}

export const playerInputHandler: SocketEventHandler<Input> = {
  event: "PLAYER_INPUT",
  handler: onPlayerInput,
};
