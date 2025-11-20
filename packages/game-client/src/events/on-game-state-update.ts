import { GameStateEvent } from "../../../game-shared/src/events/server-sent/events/game-state-event";
import { PlayerClient } from "@/entities/player";
import { ClientPositionable } from "@/extensions";
import { addEntity, removeEntity as removeEntityFromState, replaceAllEntities } from "@/state";
import { BufferReader } from "@shared/util/buffer-serialization";
import { entityTypeRegistry } from "@shared/util/entity-type-encoding";
import { ExtensionTypes } from "@shared/util/extension-types";
import { WaveState } from "@shared/types/wave";
import { InitializationContext } from "./types";

export const onGameStateUpdate = (
  context: InitializationContext,
  gameStateEvent: GameStateEvent
) => {
  if (!context.hasReceivedMap || !context.hasReceivedPlayerId) {
    if (gameStateEvent.isFullState()) {
      context.setPendingFullStateEvent(gameStateEvent);
    }
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

  // Check if we have a buffer for buffer-based deserialization
  const buffer = (gameStateEvent as any).getBuffer?.();

  if (buffer) {
    // Use buffer-based deserialization
    // Buffer format: [entityCount][entities...][gameState][removedEntityIds]
    let reader = new BufferReader(buffer);

    // Read entity count (first thing in buffer)
    const entityCount = reader.readUInt16();

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

        // If new entity is my local player, seed the ghost position too
        if (
          entity.getId() === context.gameState.playerId &&
          entity.hasExt(ClientPositionable) &&
          entity instanceof PlayerClient
        ) {
          const pos = entity.getExt(ClientPositionable).getPosition();
          (entity as unknown as PlayerClient).setServerGhostPosition(pos);
        }

        createdEntities.push(entity);
      }

      // Replace all entities
      replaceAllEntities(context.gameState, createdEntities);

      // Rebuild spatial grid for full state update
      context.gameClient.getRenderer().initializeSpatialGrid();

      if (!context.hasReceivedInitialState) {
        context.setHasReceivedInitialState(true);
        context.checkInitialization();
      }
    } else {
      // Only process delta updates after we have initial state
      if (!context.hasReceivedInitialState) {
        return;
      }

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
          const oldPos = hadPosition
            ? existingEntity.getExt(ClientPositionable).getPosition()
            : null;

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
            const dx = clientPos.x - serverPos.x;
            const dy = clientPos.y - serverPos.y;
            const error = Math.hypot(dx, dy);

            // Store server ghost position for reconciliation
            if (existingEntity instanceof PlayerClient) {
              (existingEntity as unknown as PlayerClient).setServerGhostPosition(serverPos);

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

          if (
            created.getId() !== context.gameState.playerId &&
            created.hasExt(ClientPositionable)
          ) {
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

    // After reading entities, the reader should be at the start of game state metadata
    // But GameStateEvent.deserializeFromBuffer already read it, so we don't need to read it again here
    // The gameStateEvent object already has the deserialized game state data
  } else {
    // Fallback to object-based deserialization (for backward compatibility)
    const entitiesFromServer = gameStateEvent.getEntities();
    if (gameStateEvent.isFullState()) {
      // Full state update - replace all entities
      const createdEntities = entitiesFromServer.map((entity) => {
        const created = context.gameClient.getEntityFactory().createEntity(entity);
        // Seed interpolation snapshots for non-local players
        if (created.getId() !== context.gameState.playerId && created.hasExt(ClientPositionable)) {
          const pos = created.getExt(ClientPositionable).getPosition();
          context.interpolation.addSnapshot(created.getId(), pos, timestamp);
        }
        return created;
      });
      replaceAllEntities(context.gameState, createdEntities);

      // Rebuild spatial grid for full state update
      context.gameClient.getRenderer().initializeSpatialGrid();

      if (!context.hasReceivedInitialState) {
        context.setHasReceivedInitialState(true);
        context.checkInitialization();
      }
    } else {
      // Only process delta updates after we have initial state
      if (!context.hasReceivedInitialState) {
        return;
      }

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

      // Update or add changed entities
      entitiesFromServer.forEach((serverEntityData) => {
        const existingEntity = context.gameState.entityMap.get(serverEntityData.id);
        if (existingEntity) {
          // Track if position might have changed
          const hadPosition = existingEntity.hasExt(ClientPositionable);
          const oldPos = hadPosition
            ? existingEntity.getExt(ClientPositionable).getPosition()
            : null;

          // Only update properties that were included in the delta update
          for (const [key, value] of Object.entries(serverEntityData)) {
            if (key !== "id") {
              // Skip the ID since it's used for lookup
              // For local player, avoid overriding client-predicted position unless necessary
              if (
                existingEntity.getId() === context.gameState.playerId &&
                key === "extensions" &&
                Array.isArray(value)
              ) {
                const posExt = value.find((v: any) => v.type === ExtensionTypes.POSITIONABLE);
                if (posExt && existingEntity.hasExt(ClientPositionable)) {
                  const clientPos = existingEntity.getExt(ClientPositionable).getPosition();
                  const serverPos = posExt.position;
                  const dx = clientPos.x - serverPos.x;
                  const dy = clientPos.y - serverPos.y;
                  const error = Math.hypot(dx, dy);

                  // Store server ghost position for reconciliation
                  // The PredictionManager will handle smooth reconciliation
                  if (existingEntity instanceof PlayerClient) {
                    (existingEntity as unknown as PlayerClient).setServerGhostPosition(
                      new (existingEntity.getExt(ClientPositionable).getPosition()
                        .constructor as any)(serverPos.x, serverPos.y)
                    );

                    // For very large errors, snap immediately to prevent unbounded drift
                    // The PredictionManager's reconciliation will handle smaller errors smoothly
                    if (error > (window.config?.prediction?.errorThreshold ?? 50)) {
                      // Large error: snap immediately to server position
                      existingEntity.deserializeProperty(key, value);
                      // Update spatial grid since position changed
                      context.gameClient.getRenderer().updateEntityInSpatialGrid(existingEntity);
                    } else {
                      // Let PredictionManager handle reconciliation for smaller errors
                      // Apply other extension updates without positionable
                      const filteredExts = value.filter(
                        (v: any) => v.type !== ExtensionTypes.POSITIONABLE
                      );
                      if (filteredExts.length > 0) {
                        existingEntity.deserializeProperty("extensions", filteredExts);
                      }
                    }
                  } else {
                    // For non-player entities, apply position directly
                    existingEntity.deserializeProperty(key, value);
                    // Update spatial grid since position changed
                    context.gameClient.getRenderer().updateEntityInSpatialGrid(existingEntity);
                  }
                } else {
                  existingEntity.deserializeProperty(key, value);
                }
              } else {
                existingEntity.deserializeProperty(key, value);
              }
            }
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
          const created = context.gameClient.getEntityFactory().createEntity(serverEntityData);
          if (
            created.getId() !== context.gameState.playerId &&
            created.hasExt(ClientPositionable)
          ) {
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
      });
    }
  }
};
