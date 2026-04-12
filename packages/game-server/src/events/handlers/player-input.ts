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

  // Validate facing — use numeric bounds (numeric enums + Object.values are unreliable across runtimes)
  const facing = obj.facing;
  if (
    typeof facing !== "number" ||
    !Number.isFinite(facing) ||
    facing < Direction.Down ||
    facing > Direction.UpRight
  ) {
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

  // Validate sneak - must be a boolean
  const sneak = obj.sneak;
  if (typeof sneak !== "boolean") {
    return null;
  }

  // Validate aimAngle - optional, but if present must be a finite number
  const aimAngle = obj.aimAngle;
  if (aimAngle !== undefined && (typeof aimAngle !== "number" || !Number.isFinite(aimAngle))) {
    return null;
  }

  // Validate aimDistance - optional, but if present must be a finite positive number
  const aimDistance = obj.aimDistance;
  if (aimDistance !== undefined && (typeof aimDistance !== "number" || !Number.isFinite(aimDistance) || aimDistance < 0)) {
    return null;
  }

  // Return sanitized input with clamped values
  return {
    facing: facing as Direction,
    dx: Math.max(-1, Math.min(1, dx)), // Clamp to -1 to 1
    dy: Math.max(-1, Math.min(1, dy)), // Clamp to -1 to 1
    fire,
    sprint,
    sneak,
    aimAngle: aimAngle !== undefined ? (aimAngle as number) : undefined,
    aimDistance: aimDistance !== undefined ? Math.min(1000, aimDistance as number) : undefined, // Clamp to max 1000
  };
}

export function onPlayerInput(context: HandlerContext, socket: ISocketAdapter, input: unknown): void {
  const player = context.players.get(socket.id);
  if (!player) {
    console.warn(
      `[PlayerInput] No player for socket ${socket.id}. Players in map: ${context.players.size}`,
    );
    return;
  }

  // Validate input
  const validatedInput = validateInput(input);
  if (!validatedInput) {
    console.warn(
      `[PlayerInput] Invalid payload from socket ${socket.id} playerId=${player.getId()} (see validateInput)`,
    );
    return;
  }
  player.setInput(validatedInput);
}

export const playerInputHandler: SocketEventHandler<Input> = {
  event: "PLAYER_INPUT",
  handler: onPlayerInput,
};
