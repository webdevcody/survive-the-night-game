import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";
import { ServerSentEvents } from "@shared/events/events";

export function sendFullState(context: HandlerContext, socket: ISocketAdapter): void {
  const entities = context.getEntityManager().getEntities();
  const currentTime = Date.now();

  // Cache game state data needed for metadata serialization
  const waveNumber = context.gameServer.getWaveNumber();
  const waveState = context.gameServer.getWaveState();
  const phaseStartTime = context.gameServer.getPhaseStartTime();
  const phaseDuration = context.gameServer.getPhaseDuration();

  // Clear dirty flags for all entities after sending full state
  // so they're not treated as "new" in subsequent updates
  entities.forEach((entity) => {
    entity.clearDirtyFlags();
  });

  // Serialize full state to buffer
  context.bufferManager.clear();
  context.bufferManager.writeEntityCount(entities.length);
  for (const entity of entities) {
    context.bufferManager.writeEntity(entity, false);
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
    false // No removed entities in full state
  );
  context.bufferManager.writeRemovedEntityIds([]);

  const buffer = context.bufferManager.getBuffer();
  // this.bufferManager.logStats();
  socket.emit(ServerSentEvents.GAME_STATE_UPDATE, buffer);
}

