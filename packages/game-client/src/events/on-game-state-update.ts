import { GameStateEvent } from "../../../game-shared/src/events/server-sent/events/game-state-event";
import { PlayerClient } from "@/entities/player";
import { ClientPositionable } from "@/extensions";
import { addEntity, removeEntity as removeEntityFromState, replaceAllEntities } from "@/state";
import { BufferReader } from "@shared/util/buffer-serialization";
import { entityTypeRegistry } from "@shared/util/entity-type-encoding";
import { WaveState } from "@shared/types/wave";
import { InitializationContext } from "./types";
import { Entities } from "@shared/constants";
import { distance } from "@shared/util/physics";

export const onGameStateUpdate = (
  context: InitializationContext,
  gameStateEvent: GameStateEvent
) => {
  // Don't process delta updates until we have playerId and have processed a full state
  if (
    !gameStateEvent.isFullState() &&
    (!context.hasReceivedPlayerId || !context.hasReceivedInitialState)
  ) {
    console.log(
      `[GameStateUpdate] Dropping delta update before initialization (playerId=${context.hasReceivedPlayerId}, initialState=${context.hasReceivedInitialState}).`
    );
    return;
  }

  // Don't process full state until we have playerId
  if (gameStateEvent.isFullState() && !context.hasReceivedPlayerId) {
    console.log(
      `[GameStateUpdate] Dropping full state before playerId received (playerId=${context.hasReceivedPlayerId}).`
    );
    return;
  }

  handleGameStateUpdate(context, gameStateEvent);
};

const handleGameStateUpdate = (context: InitializationContext, gameStateEvent: GameStateEvent) => {
  const timestamp = gameStateEvent.getTimestamp() ?? Date.now();

  // Calculate server time offset: clientTime - serverTime
  // This accounts for clock skew between client and server
  if (gameStateEvent.getTimestamp() !== undefined) {
    const clientTime = Date.now();
    const serverTime = timestamp;
    context.gameState.serverTimeOffset = clientTime - serverTime;
  }

  // Update game state properties only if they are included in the update
  // Wave system
  if (gameStateEvent.getWaveNumber() !== undefined) {
    context.gameState.waveNumber = gameStateEvent.getWaveNumber()!;
  }
  if (gameStateEvent.getWaveState() !== undefined) {
    const newWaveState = gameStateEvent.getWaveState()!;
    const oldWaveState = context.previousWaveState;

    // Stop battle music when wave transitions from ACTIVE to PREPARATION
    if (oldWaveState === WaveState.ACTIVE && newWaveState === WaveState.PREPARATION) {
      context.gameClient.getSoundManager().stopBattleMusic();
    }

    context.gameState.waveState = newWaveState;
    context.setPreviousWaveState(newWaveState);
  }
  if (gameStateEvent.getPhaseStartTime() !== undefined) {
    context.gameState.phaseStartTime = gameStateEvent.getPhaseStartTime()!;
  }
  if (gameStateEvent.getPhaseDuration() !== undefined) {
    context.gameState.phaseDuration = gameStateEvent.getPhaseDuration()!;
  }

  // Voting state
  const votingState = gameStateEvent.getVotingState();
  if (votingState !== undefined) {
    context.gameState.votingState = votingState;
  } else if (context.gameState.votingState?.isVotingActive) {
    // Clear voting state if it was active but no longer included in updates
    context.gameState.votingState = null;
  }

  // Zombie lives state
  const zombieLivesState = gameStateEvent.getZombieLivesState();
  if (zombieLivesState !== undefined) {
    context.gameState.zombieLivesState = zombieLivesState;
  }

  // Use buffer-based deserialization
  // Buffer format: [entityCount][entities...][gameState][removedEntityIds]
  const buffer = gameStateEvent.getBuffer();
  if (!buffer) {
    console.error("[GameStateUpdate] No buffer found in game state event - buffer is required");
    return;
  }

  let reader = new BufferReader(buffer);

  // Read entity count (first thing in buffer)
  const entityCount = reader.readUInt16();
  if (gameStateEvent.isFullState()) {
    console.log(
      `[GameStateUpdate] Processing full state buffer (${entityCount} entities, ts=${timestamp})`
    );
  }

  if (gameStateEvent.isFullState()) {
    // Full state update - replace all entities
    const createdEntities: any[] = [];
    for (let i = 0; i < entityCount; i++) {
      const entityLength = reader.readUInt16();
      const entityStartOffset = reader.getOffset();

      // Read entity ID and type to create entity
      const idReader = reader.atOffset(entityStartOffset);
      const id = idReader.readUInt16();
      // Read entity type as 1-byte numeric ID and decode to string
      const typeId = idReader.readUInt8();
      const type = entityTypeRegistry.decode(typeId);

      // Check if entity already exists
      let entity = context.gameState.entityMap.get(id);
      if (!entity) {
        // Create new entity with minimal data
        const entityData = { id, type };
        entity = context.gameClient.getEntityFactory().createEntity(entityData);
        addEntity(context.gameState, entity);
      }

      // Deserialize entity from buffer (starting from entityStartOffset)
      entity.deserializeFromBuffer(reader.atOffset(entityStartOffset));

      // Advance reader past this entity
      reader = reader.atOffset(entityStartOffset + entityLength);

      // Seed interpolation snapshots for non-local players
      if (entity.getId() !== context.gameState.playerId && entity.hasExt(ClientPositionable)) {
        const pos = entity.getExt(ClientPositionable).getPosition();
        context.interpolation.addSnapshot(entity.getId(), pos, timestamp);
      }

      // If new entity is my local player, seed the ghost position and sync inventory
      if (
        entity.getId() === context.gameState.playerId &&
        entity.hasExt(ClientPositionable) &&
        entity instanceof PlayerClient
      ) {
        const pos = entity.getExt(ClientPositionable).getPosition();
        (entity as unknown as PlayerClient).setServerGhostPosition(pos);

        // Sync inventory slot from server to client inputManager on initial load
        const inputInventoryItem = (entity as any).inputInventoryItem;
        if (inputInventoryItem !== undefined && inputInventoryItem !== null) {
          context.gameClient.syncInventorySlotFromServer(inputInventoryItem);
        }
      }

      createdEntities.push(entity);
    }

    // Replace all entities
    replaceAllEntities(context.gameState, createdEntities);
    console.log(
      `[GameStateUpdate] Applied full state (buffer) with ${createdEntities.length} entities`
    );

    // Apply map data if included in the full state
    const mapData = gameStateEvent.getMapData();
    if (mapData) {
      console.log("[GameStateUpdate] Received map data in full state");
      context.gameClient.getMapManager().setMap(mapData);
    }

    // Rebuild spatial grid for full state update
    context.gameClient.getRenderer().initializeSpatialGrid();

    if (!context.hasReceivedInitialState) {
      context.setHasReceivedInitialState(true, "Full state buffer applied");
      context.checkInitialization();
    }
  } else {
    // Delta update - process normally (we already checked initialization at the top level)

    // Delta update - update only changed entities
    const removedIds = gameStateEvent.getRemovedEntityIds();

    // Remove entities that were deleted
    removedIds.forEach((id) => {
      const entity = context.gameState.entityMap.get(id);
      if (entity) {
        context.gameClient.getRenderer().removeEntityFromSpatialGrid(entity);
      }
      removeEntityFromState(context.gameState, id);
    });

    // Update or add changed entities from buffer
    for (let i = 0; i < entityCount; i++) {
      const entityLength = reader.readUInt16();
      const entityStartOffset = reader.getOffset();

      // Read entity ID and type
      const idReader = reader.atOffset(entityStartOffset);
      const id = idReader.readUInt16();
      // Read entity type as 1-byte numeric ID and decode to string
      const typeId = idReader.readUInt8();
      const type = entityTypeRegistry.decode(typeId);

      const existingEntity = context.gameState.entityMap.get(id);
      if (existingEntity) {
        // Track if position might have changed
        const hadPosition = existingEntity.hasExt(ClientPositionable);
        const oldPos = hadPosition ? existingEntity.getExt(ClientPositionable).getPosition() : null;

        // Update existing entity from buffer
        // For local player, handle position reconciliation
        if (
          existingEntity.getId() === context.gameState.playerId &&
          existingEntity.hasExt(ClientPositionable)
        ) {
          // Store current position before deserializing
          const clientPos = existingEntity.getExt(ClientPositionable).getPosition();

          // Deserialize entity
          existingEntity.deserializeFromBuffer(reader.atOffset(entityStartOffset));

          // Get server position after deserialization
          const serverPos = existingEntity.getExt(ClientPositionable).getPosition();
          const error = distance(clientPos, serverPos);

          // Store server ghost position for reconciliation
          if (existingEntity instanceof PlayerClient) {
            (existingEntity as unknown as PlayerClient).setServerGhostPosition(serverPos);

            // Sync inventory slot from server to client inputManager
            const inputInventoryItem = (existingEntity as any).inputInventoryItem;
            if (inputInventoryItem !== undefined && inputInventoryItem !== null) {
              context.gameClient.syncInventorySlotFromServer(inputInventoryItem);
            }

            // For very large errors, snap immediately
            if (error > (window.config?.prediction?.errorThreshold ?? 50)) {
              // Already deserialized, position is updated
              // Update spatial grid since position changed
              context.gameClient.getRenderer().updateEntityInSpatialGrid(existingEntity);
            } else {
              // Restore client position for smooth reconciliation
              existingEntity.getExt(ClientPositionable).setPosition(clientPos);
            }
          }
        } else {
          // Deserialize entity from buffer
          existingEntity.deserializeFromBuffer(reader.atOffset(entityStartOffset));
        }

        // For other players, smooth movement with interpolation
        if (
          existingEntity.getId() !== context.gameState.playerId &&
          existingEntity.hasExt(ClientPositionable)
        ) {
          const rawPos = existingEntity.getExt(ClientPositionable).getPosition();
          context.interpolation.addSnapshot(existingEntity.getId(), rawPos, timestamp);
          const smooth = context.interpolation.getInterpolatedPosition(existingEntity.getId());
          if (smooth) {
            existingEntity.getExt(ClientPositionable).setPosition(smooth);
          }
        }

        // Update spatial grid if position changed
        if (existingEntity.hasExt(ClientPositionable)) {
          const newPos = existingEntity.getExt(ClientPositionable).getPosition();
          if (!oldPos || oldPos.x !== newPos.x || oldPos.y !== newPos.y) {
            context.gameClient.getRenderer().updateEntityInSpatialGrid(existingEntity);
          }
        }
      } else {
        // Add new entity
        const entityData = { id, type };
        const created = context.gameClient.getEntityFactory().createEntity(entityData);
        // Deserialize from buffer
        created.deserializeFromBuffer(reader.atOffset(entityStartOffset));

        if (created.getId() !== context.gameState.playerId && created.hasExt(ClientPositionable)) {
          const pos = created.getExt(ClientPositionable).getPosition();
          context.interpolation.addSnapshot(created.getId(), pos, timestamp);
        }
        // If new entity is my local player, seed the ghost position too
        if (
          created.getId() === context.gameState.playerId &&
          created.hasExt(ClientPositionable) &&
          created instanceof PlayerClient
        ) {
          const pos = created.getExt(ClientPositionable).getPosition();
          (created as unknown as PlayerClient).setServerGhostPosition(pos);
        }
        addEntity(context.gameState, created);
        // Add to spatial grid
        context.gameClient.getRenderer().addEntityToSpatialGrid(created);
      }

      // Advance reader past this entity
      reader = reader.atOffset(entityStartOffset + entityLength);
    }
  }
};
