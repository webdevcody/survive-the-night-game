import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";

export function setPlayerDisplayName(
  context: HandlerContext,
  socket: ISocketAdapter,
  displayName: string
): void {
  const player = context.players.get(socket.id);
  if (!player) return;
  if (displayName.length > 12) {
    displayName = displayName.substring(0, 12);
  }
  // Filter bad words and replace with asterisks
  const filteredDisplayName = context.sanitizeText(displayName);
  player.setDisplayName(filteredDisplayName);
}

