import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";

export function setPlayerDisplayName(
  context: HandlerContext,
  socket: ISocketAdapter,
  payload: { displayName: string } | string
): void {
  // Extract displayName from payload (handles both object and string formats)
  let displayName: string;
  if (typeof payload === "string") {
    displayName = payload;
  } else if (payload && typeof payload === "object" && "displayName" in payload) {
    displayName = payload.displayName;
  } else {
    console.error("Invalid payload for setDisplayName:", payload);
    return;
  }

  // Ensure displayName is a string
  if (typeof displayName !== "string") {
    console.error("displayName is not a string:", displayName);
    return;
  }

  const player = context.players.get(socket.id);
  if (!player) return;
  if (displayName.length > 12) {
    displayName = displayName.substring(0, 12);
  }
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
  handler: (context, socket, data) => setPlayerDisplayName(context, socket, data),
};
