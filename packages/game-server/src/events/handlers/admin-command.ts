import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { AdminCommand, ADMIN_COMMANDS, AdminCommandType } from "@shared/commands/commands";
import { SocketEventHandler } from "./types";

// Cache valid admin command types
const VALID_ADMIN_COMMANDS = new Set(Object.values(ADMIN_COMMANDS));

// Track failed admin command attempts per socket for additional rate limiting
const failedAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const FAILED_ATTEMPT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Validate admin command data
 */
function validateAdminCommand(data: unknown): AdminCommand | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Validate command - must be a valid admin command type
  const command = obj.command;
  if (typeof command !== "string" || !VALID_ADMIN_COMMANDS.has(command as AdminCommandType)) {
    return null;
  }

  // Validate password - must be a string
  const password = obj.password;
  if (typeof password !== "string") {
    return null;
  }

  // Validate payload - must be an object (specific validation happens in CommandManager)
  const payload = obj.payload;
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  // Basic payload validation based on command type
  const payloadObj = payload as Record<string, unknown>;

  switch (command) {
    case ADMIN_COMMANDS.CREATE_ITEM:
    case ADMIN_COMMANDS.CREATE_ENTITY: {
      // Validate position
      const position = payloadObj.position;
      if (typeof position !== "object" || position === null) {
        return null;
      }
      const posObj = position as Record<string, unknown>;
      if (
        typeof posObj.x !== "number" ||
        !Number.isFinite(posObj.x) ||
        typeof posObj.y !== "number" ||
        !Number.isFinite(posObj.y)
      ) {
        return null;
      }

      // Validate itemType or entityType
      if (command === ADMIN_COMMANDS.CREATE_ITEM) {
        if (typeof payloadObj.itemType !== "string") {
          return null;
        }
      } else {
        if (typeof payloadObj.entityType !== "string") {
          return null;
        }
      }
      break;
    }
    case ADMIN_COMMANDS.CHANGE_SKIN: {
      if (typeof payloadObj.skinType !== "string") {
        return null;
      }
      if (
        typeof payloadObj.playerId !== "number" ||
        !Number.isFinite(payloadObj.playerId) ||
        !Number.isInteger(payloadObj.playerId) ||
        payloadObj.playerId < 0
      ) {
        return null;
      }
      break;
    }
  }

  return {
    command: command as AdminCommandType,
    payload,
    password,
  };
}

/**
 * Check if socket has too many failed attempts
 */
function checkFailedAttempts(socketId: string): boolean {
  const now = Date.now();
  const attempts = failedAttempts.get(socketId);

  if (!attempts) {
    return true; // No previous failures
  }

  // Reset if outside window
  if (now - attempts.lastAttempt > FAILED_ATTEMPT_WINDOW_MS) {
    failedAttempts.delete(socketId);
    return true;
  }

  return attempts.count < MAX_FAILED_ATTEMPTS;
}

/**
 * Record a failed attempt
 */
function recordFailedAttempt(socketId: string): void {
  const now = Date.now();
  const attempts = failedAttempts.get(socketId);

  if (!attempts || now - attempts.lastAttempt > FAILED_ATTEMPT_WINDOW_MS) {
    failedAttempts.set(socketId, { count: 1, lastAttempt: now });
  } else {
    failedAttempts.set(socketId, { count: attempts.count + 1, lastAttempt: now });
  }
}

export function handleAdminCommand(
  context: HandlerContext,
  socket: ISocketAdapter,
  command: AdminCommand
): void {
  // Check failed attempts rate limiting
  if (!checkFailedAttempts(socket.id)) {
    console.warn(`Socket ${socket.id} blocked from admin commands due to too many failed attempts`);
    return;
  }

  // Store original handleCommand behavior to track failures
  try {
    context.getCommandManager().handleCommand(command);
  } catch (error) {
    console.error(`Admin command error from socket ${socket.id}:`, error);
    recordFailedAttempt(socket.id);
  }
}

export const adminCommandHandler: SocketEventHandler<AdminCommand> = {
  event: "ADMIN_COMMAND",
  handler: (context, socket, data) => {
    const validated = validateAdminCommand(data);
    if (!validated) {
      console.warn(`Invalid admin command data from socket ${socket.id}`);
      recordFailedAttempt(socket.id);
      return;
    }
    handleAdminCommand(context, socket, validated);
  },
};
