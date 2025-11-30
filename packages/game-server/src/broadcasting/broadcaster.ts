import { ServerSentEvents } from "@shared/events/events";
import { GameEvent } from "@shared/events/types";
import { IServerAdapter } from "@shared/network/server-adapter";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { IEntityManager } from "@/managers/types";
import { IEntity } from "@/entities/types";
import { GameServer } from "@/core/server";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
import { BufferManager } from "./buffer-manager";
import { serializeServerEvent } from "@shared/events/server-sent/server-event-serialization";

export interface BroadcastDependencies {
  io: IServerAdapter;
  entityManager: IEntityManager;
  gameServer: GameServer;
  bufferManager: BufferManager;
  tickPerformanceTracker: TickPerformanceTracker | null;
}

/**
 * Handles all server → client event broadcasting logic.
 * Extracted from ServerSocketManager to separate concerns.
 */
export class Broadcaster {
  private totalBytesSent: number = 0;
  private bytesSentThisSecond: number = 0;
  private lastSecondTimestamp: number = Date.now();
  private statsInterval: NodeJS.Timeout | null = null;

  constructor(private deps: BroadcastDependencies) {
    // Start stats reporting interval (every 5 seconds)
    // this.statsInterval = setInterval(() => {
    //   this.printStats();
    // }, 5000);
  }

  /**
   * Calculate the byte size of event data
   */
  private calculateEventBytes(eventData: any): number {
    if (eventData === undefined || eventData === null) {
      return 0;
    }
    // If it's a Buffer, return its length directly
    if (Buffer.isBuffer(eventData)) {
      return eventData.length;
    }
    try {
      const serialized = JSON.stringify(eventData);
      if (serialized === undefined || serialized === null) {
        return 0;
      }
      // Use Buffer.byteLength to get accurate UTF-8 byte count
      return Buffer.byteLength(String(serialized), "utf8");
    } catch (error) {
      // Handle circular references or other serialization errors
      console.warn("Failed to calculate event bytes:", error);
      return 0;
    }
  }

  /**
   * Track bytes sent for a broadcast event
   */
  private trackBytesSent(eventData: any): void {
    const bytesPerEvent = this.calculateEventBytes(eventData);
    const playerCount = this.deps.io.sockets.sockets.size;
    const totalBytesForBroadcast = bytesPerEvent * playerCount;

    this.totalBytesSent += totalBytesForBroadcast;

    const now = Date.now();
    const elapsedMs = now - this.lastSecondTimestamp;

    // If more than 1 second has passed since last reset, reset the counter
    if (elapsedMs >= 1000) {
      this.bytesSentThisSecond = totalBytesForBroadcast;
      this.lastSecondTimestamp = now;
    } else {
      // Accumulate bytes for the current second
      this.bytesSentThisSecond += totalBytesForBroadcast;
    }
  }

  /**
   * Get current bandwidth stats (bytes sent in the last second)
   */
  public getCurrentBandwidth(): number {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastSecondTimestamp) / 1000;

    if (elapsedSeconds > 1) {
      // More than 1 second has passed, return 0
      return 0;
    }

    // Return bytes per second
    return elapsedSeconds > 0
      ? this.bytesSentThisSecond / elapsedSeconds
      : this.bytesSentThisSecond;
  }

  /**
   * Print bandwidth statistics every 5 seconds
   */
  private printStats(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastSecondTimestamp) / 1000;

    // Calculate MB/s based on bytes sent in the current second
    // Use elapsed time to get accurate per-second rate
    const mbPerSecond =
      elapsedSeconds > 0 ? this.bytesSentThisSecond / (1024 * 1024) / elapsedSeconds : 0;

    console.log(
      `[Bandwidth] ${mbPerSecond.toFixed(5)} MB/s (${this.deps.io.sockets.sockets.size} players)`
    );
  }

  /**
   * Clean up resources (stop stats interval)
   */
  public cleanup(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  public broadcastEvent(event: GameEvent<any>): void {
    // Early return optimization: if no clients connected, skip broadcasting
    const connectedClients = this.deps.io.sockets.sockets.size;
    if (connectedClients === 0) {
      return;
    }

    if (event.getType() === ServerSentEvents.GAME_STATE_UPDATE) {
      this.broadcastGameStateUpdate(event);
    } else {
      this.broadcastRegularEvent(event);
    }
  }

  /**
   * Broadcast a game state update event (special handling for entity serialization)
   */
  private broadcastGameStateUpdate(event: GameEvent<any>): void {
    // Track entity state tracking operations
    const endEntityStateTracking =
      this.deps.tickPerformanceTracker?.startMethod("entityStateTracking", "broadcastGameState") ||
      (() => {});
    const entityStateTracker = this.deps.entityManager.getEntityStateTracker();

    // Early return optimization: check cheapest checks first
    const removedEntityIds = entityStateTracker.getRemovedEntityIds();
    const removedCount = removedEntityIds.length;

    // Extract game state properties from the passed event (optimized)
    const eventSerialize = (event as any).serialize;
    const eventData = eventSerialize ? eventSerialize.call(event) : {};

    // Optimize hasGameStateChanges check: iterate directly instead of Object.keys().some()
    let hasGameStateChanges = false;
    for (const key in eventData) {
      if (key !== "entities" && key !== "timestamp" && eventData[key] !== undefined) {
        hasGameStateChanges = true;
        break;
      }
    }

    // Early return optimization: only get entities if we might have changes
    // If we have removed entities or game state changes, we definitely need to process
    // Otherwise, check changed entities to see if we can early return
    let entities: IEntity[];
    let changedEntities: IEntity[];
    let changedCount: number;

    if (removedCount === 0 && !hasGameStateChanges) {
      // No removed entities and no game state changes - check if any entities changed
      changedEntities = entityStateTracker.getChangedEntities();
      changedCount = changedEntities.length;
      if (changedCount === 0) {
        endEntityStateTracking();
        return; // No changes to broadcast
      }
      entities = this.deps.entityManager.getEntities();
    } else {
      // We have removed entities or game state changes - need to process
      entities = this.deps.entityManager.getEntities();
      changedEntities = entityStateTracker.getChangedEntities();
      changedCount = changedEntities.length;
    }

    // Final early return check
    if (changedCount === 0 && removedCount === 0 && !hasGameStateChanges) {
      endEntityStateTracking();
      return; // No changes to broadcast
    }
    endEntityStateTracking();

    // Track game state preparation
    const endGameStatePrep =
      this.deps.tickPerformanceTracker?.startMethod("gameStatePreparation", "broadcastGameState") ||
      (() => {});
    // Cache all gameServer getter results before creating currentGameState object
    const waveNumber = this.deps.gameServer.getWaveNumber();
    const waveState = this.deps.gameServer.getWaveState();
    const phaseStartTime = this.deps.gameServer.getPhaseStartTime();
    const phaseDuration = this.deps.gameServer.getPhaseDuration();
    endGameStatePrep();

    // Clear buffer manager for new game loop
    this.deps.bufferManager.clear();

    // Track entity serialization
    const endEntitySerialization =
      this.deps.tickPerformanceTracker?.startMethod("entitySerialization", "broadcastGameState") ||
      (() => {});
    // Write entity count
    this.deps.bufferManager.writeEntityCount(changedCount);
    // For each changed entity, serialize to buffer based on dirty state
    // Changed entities will have only dirty extensions, so serialize(true) will include only changes
    for (const entity of changedEntities) {
      this.deps.bufferManager.writeEntity(entity, true);
    }
    endEntitySerialization();

    // Track game state merging
    const endGameStateMerging =
      this.deps.tickPerformanceTracker?.startMethod("gameStateMerging", "broadcastGameState") ||
      (() => {});
    // Get current game state (using cached values)
    const currentGameState = {
      // Wave system
      waveNumber,
      waveState,
      phaseStartTime,
      phaseDuration,
    };

    // Get only changed game state properties
    const changedGameState = entityStateTracker.getChangedGameStateProperties(currentGameState);

    // Optimize mergedGameState construction: build object directly instead of Object.fromEntries/Object.entries
    const mergedGameState: Record<string, any> = { ...changedGameState };
    for (const key in eventData) {
      if (key !== "entities" && key !== "timestamp") {
        mergedGameState[key] = eventData[key];
      }
    }

    // Reuse timestamp from eventData if available, otherwise use Date.now()
    const timestamp = eventData.timestamp !== undefined ? eventData.timestamp : Date.now();

    // Write game state metadata to buffer
    const hasRemovedEntities = removedCount > 0;
    const votingState = mergedGameState.votingState;
    const zombieLivesState = mergedGameState.zombieLivesState;
    this.deps.bufferManager.writeGameState(
      {
        ...mergedGameState,
        timestamp,
        isFullState: false,
      },
      hasRemovedEntities,
      undefined, // no mapData for delta updates
      votingState,
      zombieLivesState
    );

    // Write removed entity IDs (only if there are any)
    this.deps.bufferManager.writeRemovedEntityIds(removedEntityIds);

    // Write voting state (only if present)
    if (votingState) {
      this.deps.bufferManager.writeVotingState(votingState);
    }

    // Write zombie lives state (only if present)
    if (zombieLivesState) {
      this.deps.bufferManager.writeZombieLivesState(zombieLivesState);
    }
    endGameStateMerging();

    // Track cleanup operations
    const endCleanup =
      this.deps.tickPerformanceTracker?.startMethod("broadcastCleanup", "broadcastGameState") ||
      (() => {});

    // Log dirty entity information for diagnostics (if performance monitoring enabled)
    if (this.deps.tickPerformanceTracker && changedCount > 0) {
      const dirtyEntityInfo = entityStateTracker.getDirtyEntityInfo();
      if (dirtyEntityInfo.length > 0) {
        this.deps.tickPerformanceTracker.recordDirtyEntities(
          dirtyEntityInfo.map((info) => ({
            id: String(info.id),
            type: info.type,
            reason: info.reason,
          })),
          changedCount,
          entities.length
        );
      }
    }

    // Clear dirty flags after broadcasting (optimized loop)
    for (const entity of changedEntities) {
      entity.clearDirtyFlags();
    }
    entityStateTracker.trackGameState(currentGameState);
    // Clear removed entity IDs after they've been sent
    entityStateTracker.clearRemovedEntityIds();
    // Clear dirty entity info after logging
    entityStateTracker.clearDirtyEntityInfo();
    endCleanup();

    // Track websocket emit
    const endWebSocketEmit =
      this.deps.tickPerformanceTracker?.startMethod("webSocketEmit", "broadcastGameState") ||
      (() => {});
    // Send buffer directly instead of serializing to objects
    const buffer = this.deps.bufferManager.getBuffer();
    // this.deps.bufferManager.logStats();
    this.trackBytesSent(buffer);
    this.deps.io.emit(event.getType(), buffer);
    endWebSocketEmit();
  }

  /**
   * Broadcast a regular event (non-game-state-update)
   */
  private broadcastRegularEvent(event: GameEvent<any>): void {
    // Serialize as binary buffer only
    const serializedData = event.serialize();
    const binaryBuffer = serializeServerEvent(event.getType(), [serializedData]);
    if (binaryBuffer !== null) {
      // Send as binary
      this.trackBytesSent(binaryBuffer);
      this.deps.io.emit(event.getType(), binaryBuffer);
    } else {
      // If binary serialization fails, log error but don't send JSON fallback
      console.error(`Failed to serialize event ${event.getType()} as binary buffer`);
    }
  }
}
