import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";

// Maximum display name length
const MAX_DISPLAY_NAME_LENGTH = 12;

/**
 * Validate display name data
 * Returns sanitized display name or null if invalid
 */
function validateDisplayNameData(payload: unknown): string | null {
  // Handle string format
  if (typeof payload === "string") {
    if (payload.length === 0) {
      return null;
    }
    return payload.substring(0, MAX_DISPLAY_NAME_LENGTH);
  }

  // Handle object format
  if (typeof payload === "object" && payload !== null) {
    const obj = payload as Record<string, unknown>;
    const displayName = obj.displayName;

    if (typeof displayName !== "string" || displayName.length === 0) {
      return null;
    }

    return displayName.substring(0, MAX_DISPLAY_NAME_LENGTH);
  }

  return null;
}

export function setPlayerDisplayName(
  context: HandlerContext,
  socket: ISocketAdapter,
  displayName: string
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  // Filter bad words and replace with asterisks
  const filteredDisplayName = context.sanitizeText(displayName);
  player.setDisplayName(filteredDisplayName);
  // Update the playerDisplayNames map for consistency
  context.playerDisplayNames.set(socket.id, filteredDisplayName);
  // Note: setDisplayName() calls serialized.set() which automatically marks the entity dirty
  // via the callback, so the entity will be included in the next game state broadcast
}

export const setDisplayNameHandler: SocketEventHandler<{ displayName: string }> = {
  event: "SET_DISPLAY_NAME",
  handler: (context, socket, data) => {
    const validated = validateDisplayNameData(data);
    if (!validated) {
      console.warn(`Invalid display name data from socket ${socket.id}`);
      return;
    }
    setPlayerDisplayName(context, socket, validated);
  },
};
