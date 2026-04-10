import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { Input } from "@shared/util/input";
import { SocketEventHandler } from "./types";
import { Direction } from "@shared/util/direction";

// #region agent log
let __agentPlayerInputSeq = 0;
function __agentLogPlayerInput(payload: {
  message: string;
  hypothesisId: string;
  data: Record<string, unknown>;
}): void {
  fetch("http://127.0.0.1:7825/ingest/2642c761-9d6c-4bd7-b4a8-ef39e8a5fbf3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "65179d" },
    body: JSON.stringify({
      sessionId: "65179d",
      runId: "pre-fix",
      location: "player-input.ts",
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {});
}
// #endregion

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
    aimAngle: aimAngle !== undefined ? (aimAngle as number) : undefined,
    aimDistance: aimDistance !== undefined ? Math.min(1000, aimDistance as number) : undefined, // Clamp to max 1000
  };
}

export function onPlayerInput(context: HandlerContext, socket: ISocketAdapter, input: unknown): void {
  // #region agent log
  const seq = ++__agentPlayerInputSeq;
  const shouldLog = seq <= 25 || seq % 200 === 0;
  const isBin =
    typeof Buffer !== "undefined" &&
    Buffer.isBuffer(input as Parameters<typeof Buffer.isBuffer>[0]);
  const isAb = typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer;
  if (shouldLog && (isBin || isAb)) {
    __agentLogPlayerInput({
      message: "onPlayerInput received raw buffer (Socket.IO path may not deserialize)",
      hypothesisId: "H6",
      data: { seq, socketId: socket.id, isBin, isAb, len: isBin ? (input as Buffer).length : (input as ArrayBuffer).byteLength },
    });
  }
  // #endregion
  const player = context.players.get(socket.id);
  if (!player) {
    console.warn(`[onPlayerInput] No player found for socket ${socket.id}. Players in map: ${context.players.size}`);
    // #region agent log
    if (shouldLog) {
      __agentLogPlayerInput({
        message: "onPlayerInput no player",
        hypothesisId: "H2",
        data: { seq, socketId: socket.id, playerMapSize: context.players.size },
      });
    }
    // #endregion
    return;
  }

  // Validate input
  const validatedInput = validateInput(input);
  if (!validatedInput) {
    console.warn(`Invalid player input from socket ${socket.id}`);
    // #region agent log
    if (shouldLog) {
      const o =
        input && typeof input === "object"
          ? (input as Record<string, unknown>)
          : { _raw: String(input) };
      __agentLogPlayerInput({
        message: "onPlayerInput validation failed",
        hypothesisId: "H1",
        data: {
          seq,
          socketId: socket.id,
          facing: o.facing,
          facingType: typeof o.facing,
          dx: o.dx,
          dy: o.dy,
          fire: o.fire,
          fireType: typeof o.fire,
          sprint: o.sprint,
          sprintType: typeof o.sprint,
        },
      });
    }
    // #endregion
    return;
  }

  // #region agent log
  if (shouldLog) {
    __agentLogPlayerInput({
      message: "onPlayerInput applied",
      hypothesisId: "H1",
      data: {
        seq,
        socketId: socket.id,
        dx: validatedInput.dx,
        dy: validatedInput.dy,
        sprint: validatedInput.sprint,
        fire: validatedInput.fire,
      },
    });
  }
  // #endregion
  player.setInput(validatedInput);
}

export const playerInputHandler: SocketEventHandler<Input> = {
  event: "PLAYER_INPUT",
  handler: onPlayerInput,
};
