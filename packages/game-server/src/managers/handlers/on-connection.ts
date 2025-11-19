import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";
import { Player } from "@/entities/player";

export function onConnection(context: HandlerContext, socket: ISocketAdapter): void {
  console.log(`Player connected: ${socket.id} - ${context.playerDisplayNames.get(socket.id)}`);

  // Note: setupSocketListeners should be called before onConnection in ServerSocketManager

  // Check if there's already a player for this socket ID (can happen on quick reconnect)
  const existingPlayer = context.players.get(socket.id);
  if (existingPlayer) {
    console.log(`Cleaning up existing player for socket ${socket.id} before creating new one`);
    // Remove the existing player entity to prevent duplicates
    context.getEntityManager().removeEntity(existingPlayer.getId());
    context.players.delete(socket.id);
  }

  const totalPlayers = context
    .getEntityManager()
    .getPlayerEntities()
    .filter((entity) => !(entity as Player).isMarkedForRemoval()).length;

  if (totalPlayers === 0) {
    console.log("Starting new game");
    // Start the new game (which will recreate all players including this newly connected socket)
    context.gameServer.startNewGame();

    // After startNewGame(), recreatePlayersForConnectedSockets() should have created
    // a player for all connected sockets including this one. Verify it exists.
    let player = context.players.get(socket.id);
    if (!player) {
      // This shouldn't happen, but handle it gracefully
      console.warn(`Player for socket ${socket.id} not found after startNewGame(), creating one`);
      player = context.createPlayerForSocket(socket);
      context.sendInitialDataToSocket(socket, player);
      context.broadcastPlayerJoined(player);
    } else {
      // Player was created by recreatePlayersForConnectedSockets(), which already
      // sent initial data and broadcast join. Just verify initial data was sent.
      // (recreatePlayersForConnectedSockets already handles this, so we don't need to do anything)
    }

    return;
  }

  const player = context.createPlayerForSocket(socket);
  context.sendInitialDataToSocket(socket, player);
  context.broadcastPlayerJoined(player);
}
