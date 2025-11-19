import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { Player } from "@/entities/players/player";

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
    context.gameServer.startNewGame();
    let player = context.players.get(socket.id);
    let shouldBroadcastJoin = false;

    if (!player) {
      player = context.createPlayerForSocket(socket);
      shouldBroadcastJoin = true;
    }

    context.sendInitialDataToSocket(socket, player);

    if (shouldBroadcastJoin) {
      context.broadcastPlayerJoined(player);
    }

    return;
  }

  const player = context.createPlayerForSocket(socket);
  context.sendInitialDataToSocket(socket, player);
  context.broadcastPlayerJoined(player);
}

