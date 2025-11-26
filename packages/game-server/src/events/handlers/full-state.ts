import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { ServerSentEvents } from "@shared/events/events";
import { SocketEventHandler } from "./types";

export function sendFullState(context: HandlerContext, socket: ISocketAdapter): void {
  const entities = context.getEntityManager().getEntities();
  const currentTime = Date.now();

  // Cache game state data needed for metadata serialization
  const waveNumber = context.gameServer.getWaveNumber();
  const waveState = context.gameServer.getWaveState();
  const phaseStartTime = context.gameServer.getPhaseStartTime();
  const phaseDuration = context.gameServer.getPhaseDuration();

  // Get map data to include in full state
  const mapData = context.getMapManager().getMapData();

  // Serialize full state to buffer
  // Pass onlyDirty=false to serialize all fields and all extensions with all their data
  context.bufferManager.clear();
  context.bufferManager.writeEntityCount(entities.length);
  for (const entity of entities) {
    context.bufferManager.writeEntity(entity, false); // onlyDirty=false (full serialization)
  }
  context.bufferManager.writeGameState(
    {
      timestamp: currentTime,
      isFullState: true,
      waveNumber,
      waveState,
      phaseStartTime,
      phaseDuration,
    },
    false, // No removed entities in full state
    mapData // Include map data in full state
  );
  context.bufferManager.writeRemovedEntityIds([]);
  context.bufferManager.writeMapData(mapData);

  const buffer = context.bufferManager.getBuffer();
  // this.bufferManager.logStats();
  socket.emit(ServerSentEvents.GAME_STATE_UPDATE, buffer);
}

export const requestFullStateHandler: SocketEventHandler<void> = {
  event: "REQUEST_FULL_STATE",
  handler: sendFullState,
};
