import { ServerSentEvents, ClientSentEvents } from "@shared/events/events";
import { GameOverEvent } from "@shared/events/server-sent/game-over-event";
import { GameStateEvent } from "@shared/events/server-sent/game-state-event";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { GunFiredEvent } from "@shared/events/server-sent/gun-fired-event";
import { LootEvent } from "@shared/events/server-sent/loot-event";
import { MapEvent } from "@shared/events/server-sent/map-event";
import { weaponRegistry, WeaponConfig } from "@shared/entities";
import { PlayerPickedUpItemEvent } from "@shared/events/server-sent/pickup-item-event";
import { PlayerPickedUpResourceEvent } from "@shared/events/server-sent/pickup-resource-event";
import { PlayerAttackedEvent } from "@shared/events/server-sent/player-attacked-event";
import { PlayerDeathEvent } from "@shared/events/server-sent/player-death-event";
import { PlayerDroppedItemEvent } from "@shared/events/server-sent/player-dropped-item-event";
import { PlayerHurtEvent } from "@shared/events/server-sent/player-hurt-event";
import { YourIdEvent } from "@shared/events/server-sent/your-id-event";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { CoinPickupEvent } from "@shared/events/server-sent/coin-pickup-event";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import { ZombieHurtEvent } from "@shared/events/server-sent/zombie-hurt-event";
import { GameClient } from "@/client";
import { PlayerClient } from "@/entities/player";
import { ZombieClient } from "@/entities/zombie";
import { ClientPositionable } from "@/extensions";
import { ClientSocketManager } from "@/managers/client-socket-manager";
import { SOUND_TYPES_TO_MP3, SoundType } from "@/managers/sound-manager";
import {
  GameState,
  addEntity,
  removeEntity as removeEntityFromState,
  clearEntities,
  replaceAllEntities,
} from "@/state";
import { BufferReader } from "@shared/util/buffer-serialization";
import { entityTypeRegistry } from "@shared/util/entity-type-encoding";
import { SwipeParticle } from "./particles/swipe";
import { Direction, determineDirection } from "@shared/util/direction";
import { GameStartedEvent } from "@shared/events/server-sent/game-started-event";
import { PlayerJoinedEvent } from "@shared/events/server-sent/player-joined-event";
import { ServerUpdatingEvent } from "@shared/events/server-sent/server-updating-event";
import { ChatMessageEvent } from "@shared/events/server-sent/chat-message-event";
import { GameMessageEvent } from "@shared/events/server-sent/game-message-event";
import { PlayerLeftEvent } from "@shared/events/server-sent/player-left-event";
import { ExplosionParticle } from "./particles/explosion";
import { SummonParticle } from "./particles/summon";
import { ExplosionEvent } from "@shared/events/server-sent/explosion-event";
import { CarRepairEvent } from "@shared/events/server-sent/car-repair-event";
import { WaveStartEvent } from "@shared/events/server-sent/wave-start-event";
import { CraftEvent } from "@shared/events/server-sent/craft-event";
import { BuildEvent } from "@shared/events/server-sent/build-event";
import { BossStepEvent } from "@shared/events/server-sent/boss-step-event";
import { BossSummonEvent } from "@shared/events/server-sent/boss-summon-event";
import { InterpolationManager } from "@/managers/interpolation";
import { ExtensionTypes } from "@shared/util/extension-types";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { distance } from "@shared/util/physics";
import { CoinClient } from "./entities/items/coin";
import { WaveState } from "@shared/types/wave";

const ZOMBIE_SHAKE_MAX_DISTANCE = 480;
const ZOMBIE_SHAKE_DURATION_MS = 160;
const ZOMBIE_SHAKE_MAX_INTENSITY = 4;
const EXPLOSION_SHAKE_MAX_DISTANCE = 640;
const EXPLOSION_SHAKE_DURATION_MS = 240;
const EXPLOSION_SHAKE_MAX_INTENSITY = 5.5;
const WEAPON_SHAKE_DURATION_MS = 140;
const WAVE_START_SHAKE_INTENSITY = 4.5;
const WAVE_START_SHAKE_DURATION_MS = 420;

export class ClientEventListener {
  private socketManager: ClientSocketManager;
  private gameClient: GameClient;
  private gameState: GameState;
  private hasReceivedMap = false;
  private hasReceivedPlayerId = false;
  private hasReceivedInitialState = false;
  private interpolation: InterpolationManager = new InterpolationManager();
  private previousWaveState: WaveState | undefined = undefined;
  private pendingFullStateEvent: GameStateEvent | null = null;

  private isInitialized(): boolean {
    return this.hasReceivedMap && this.hasReceivedPlayerId && this.hasReceivedInitialState;
  }

  /**
   * Guards against processing events that depend on entities before initial state is received.
   * Returns true if the event should be processed, false if it should be ignored.
   */
  private shouldProcessEntityEvent(): boolean {
    return this.hasReceivedInitialState;
  }

  constructor(client: GameClient, socketManager: ClientSocketManager) {
    this.gameClient = client;
    this.socketManager = socketManager;
    this.gameState = this.gameClient.getGameState();

    // Prevent game from starting until we're initialized
    this.gameClient.stop();

    // Set up event listeners first, before requesting state
    this.socketManager.on(ServerSentEvents.GAME_STATE_UPDATE, this.onGameStateUpdate.bind(this));
    this.socketManager.on(ServerSentEvents.MAP, this.onMap.bind(this));
    this.socketManager.on(ServerSentEvents.YOUR_ID, this.onYourId.bind(this));
    this.socketManager.on(ServerSentEvents.PLAYER_HURT, this.onPlayerHurt.bind(this));
    this.socketManager.on(ServerSentEvents.PLAYER_DEATH, this.onPlayerDeath.bind(this));
    this.socketManager.on(ServerSentEvents.PLAYER_JOINED, this.onPlayerJoined.bind(this));
    this.socketManager.on(ServerSentEvents.PLAYER_ATTACKED, this.onPlayerAttacked.bind(this));
    this.socketManager.on(ServerSentEvents.ZOMBIE_DEATH, this.onZombieDeath.bind(this));
    this.socketManager.on(ServerSentEvents.ZOMBIE_HURT, this.onZombieHurt.bind(this));
    this.socketManager.on(ServerSentEvents.GUN_EMPTY, this.onGunEmpty.bind(this));
    this.socketManager.on(ServerSentEvents.GUN_FIRED, this.onGunFired.bind(this));
    this.socketManager.on(ServerSentEvents.LOOT, this.onLoot.bind(this));
    this.socketManager.on(ServerSentEvents.ZOMBIE_ATTACKED, this.onZombieAttacked.bind(this));
    this.socketManager.on(ServerSentEvents.GAME_OVER, this.onGameOver.bind(this));
    this.socketManager.on(ServerSentEvents.GAME_STARTED, this.onGameStarted.bind(this));
    this.socketManager.on(ServerSentEvents.PLAYER_LEFT, this.onPlayerLeft.bind(this));
    this.socketManager.on(ServerSentEvents.SERVER_UPDATING, this.onServerUpdating.bind(this));
    this.socketManager.on(ServerSentEvents.CHAT_MESSAGE, this.onChatMessage.bind(this));
    this.socketManager.on(ServerSentEvents.GAME_MESSAGE, this.onGameMessage.bind(this));
    this.socketManager.on(ServerSentEvents.COIN_PICKUP, this.onCoinPickup.bind(this));
    this.socketManager.on(
      ServerSentEvents.PLAYER_DROPPED_ITEM,
      this.onPlayerDroppedItem.bind(this)
    );
    this.socketManager.on(
      ServerSentEvents.PLAYER_PICKED_UP_ITEM,
      this.onPlayerPickedUpItem.bind(this)
    );
    this.socketManager.on(
      ServerSentEvents.PLAYER_PICKED_UP_RESOURCE,
      this.onPlayerPickedUpResource.bind(this)
    );
    this.socketManager.on(ServerSentEvents.EXPLOSION, this.onExplosion.bind(this));
    this.socketManager.on(ServerSentEvents.CAR_REPAIR, this.onCarRepair.bind(this));
    this.socketManager.on(ServerSentEvents.WAVE_START, this.onWaveStart.bind(this));
    this.socketManager.on(ServerSentEvents.CRAFT, this.onCraft.bind(this));
    this.socketManager.on(ServerSentEvents.BUILD, this.onBuild.bind(this));
    this.socketManager.on(ServerSentEvents.BOSS_STEP, this.onBossStep.bind(this));
    this.socketManager.on(ServerSentEvents.BOSS_SUMMON, this.onBossSummon.bind(this));

    // Request full state after all listeners are set up
    // If already connected, request immediately; otherwise the connect handler will request it
    // Use setTimeout to ensure this runs after the constructor completes and socket is ready
    setTimeout(() => {
      if (!this.socketManager.getIsDisconnected()) {
        console.log("[ClientEventListener] Requesting full state after listener setup");
        this.socketManager.sendRequestFullState();
      }
    }, 0);

    // Listen for disconnect to reset initialization state
    this.socketManager.onSocketDisconnect(() => {
      this.handleDisconnect();
    });
  }

  private handleDisconnect(): void {
    console.log("[ClientEventListener] Server disconnected, resetting initialization state");
    // Reset initialization flags so we wait for fresh data on reconnect
    this.hasReceivedMap = false;
    this.hasReceivedPlayerId = false;
    this.hasReceivedInitialState = false;
    this.pendingFullStateEvent = null;

    // Stop the game until we're re-initialized
    this.gameClient.stop();

    // Clear entities to prevent stale state
    clearEntities(this.gameState);

    // Show message to user
    this.gameClient.getHud().addMessage("Disconnected from server. Reconnecting...", "yellow");
  }

  onServerUpdating(serverUpdatingEvent: ServerUpdatingEvent) {
    this.gameClient.getHud().addMessage("Server is updating, you will be reconnected shortly...");
  }

  onGunEmpty(gunEmptyEvent: GunEmptyEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const player = this.gameClient.getEntityById(gunEmptyEvent.getEntityId());
    if (!player || !(player instanceof PlayerClient)) return;

    const playerPosition = player.getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.GUN_EMPTY, playerPosition);
  }

  onGunFired(gunFiredEvent: GunFiredEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const player = this.gameClient.getEntityById(gunFiredEvent.getEntityId());
    if (!player || !(player instanceof PlayerClient)) return;

    const playerPosition = player.getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.PISTOL, playerPosition);
  }

  onCoinPickup(coinPickupEvent: CoinPickupEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const coin = this.gameClient.getEntityById(coinPickupEvent.getEntityId());
    if (!coin) return;

    const coinPosition = coin.getExt(ClientPositionable).getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.COIN_PICKUP, coinPosition);
  }

  onPlayerLeft(playerLeftEvent: PlayerLeftEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const playerId = playerLeftEvent.getPlayerId();
    const player = this.gameClient.getEntityById(playerId);
    if (!player) return;
    this.gameClient.getHud().addMessage(`${playerLeftEvent.getDisplayName()} left the game`);
    this.gameClient.removeEntity(playerLeftEvent.getPlayerId());
  }

  onGameStateUpdate(gameStateEvent: GameStateEvent) {
    if (!this.hasReceivedMap || !this.hasReceivedPlayerId) {
      if (gameStateEvent.isFullState()) {
        this.pendingFullStateEvent = gameStateEvent;
      }
      return;
    }

    this.handleGameStateUpdate(gameStateEvent);
  }

  private handleGameStateUpdate(gameStateEvent: GameStateEvent) {
    const timestamp = gameStateEvent.getTimestamp() ?? Date.now();

    // Calculate server time offset: clientTime - serverTime
    // This accounts for clock skew between client and server
    if (gameStateEvent.getTimestamp() !== undefined) {
      const clientTime = Date.now();
      const serverTime = timestamp;
      this.gameState.serverTimeOffset = clientTime - serverTime;
    }

    // Update game state properties only if they are included in the update
    // Wave system
    if (gameStateEvent.getWaveNumber() !== undefined) {
      this.gameState.waveNumber = gameStateEvent.getWaveNumber()!;
    }
    if (gameStateEvent.getWaveState() !== undefined) {
      const newWaveState = gameStateEvent.getWaveState()!;
      const oldWaveState = this.previousWaveState;

      // Stop battle music when wave transitions from ACTIVE to PREPARATION
      if (oldWaveState === WaveState.ACTIVE && newWaveState === WaveState.PREPARATION) {
        this.gameClient.getSoundManager().stopBattleMusic();
      }

      this.gameState.waveState = newWaveState;
      this.previousWaveState = newWaveState;
    }
    if (gameStateEvent.getPhaseStartTime() !== undefined) {
      this.gameState.phaseStartTime = gameStateEvent.getPhaseStartTime()!;
    }
    if (gameStateEvent.getPhaseDuration() !== undefined) {
      this.gameState.phaseDuration = gameStateEvent.getPhaseDuration()!;
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
          let entity = this.gameState.entityMap.get(id);
          if (!entity) {
            // Create new entity with minimal data
            const entityData = { id, type };
            entity = this.gameClient.getEntityFactory().createEntity(entityData);
            addEntity(this.gameState, entity);
          }

          // Deserialize entity from buffer (starting from entityStartOffset)
          entity.deserializeFromBuffer(reader.atOffset(entityStartOffset));

          // Advance reader past this entity
          reader = reader.atOffset(entityStartOffset + entityLength);

          // Seed interpolation snapshots for non-local players
          if (entity.getId() !== this.gameState.playerId && entity.hasExt(ClientPositionable)) {
            const pos = entity.getExt(ClientPositionable).getPosition();
            this.interpolation.addSnapshot(entity.getId(), pos, timestamp);
          }

          // If new entity is my local player, seed the ghost position too
          if (
            entity.getId() === this.gameState.playerId &&
            entity.hasExt(ClientPositionable) &&
            entity instanceof PlayerClient
          ) {
            const pos = entity.getExt(ClientPositionable).getPosition();
            (entity as unknown as PlayerClient).setServerGhostPosition(pos);
          }

          createdEntities.push(entity);
        }

        // Replace all entities
        replaceAllEntities(this.gameState, createdEntities);

        if (!this.hasReceivedInitialState) {
          this.hasReceivedInitialState = true;
          this.checkInitialization();
        }
      } else {
        // Only process delta updates after we have initial state
        if (!this.hasReceivedInitialState) {
          return;
        }

        // Delta update - update only changed entities
        const removedIds = gameStateEvent.getRemovedEntityIds();

        // Remove entities that were deleted
        removedIds.forEach((id) => {
          removeEntityFromState(this.gameState, id);
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

          const existingEntity = this.gameState.entityMap.get(id);
          if (existingEntity) {
            // Update existing entity from buffer
            // For local player, handle position reconciliation
            if (
              existingEntity.getId() === this.gameState.playerId &&
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
              existingEntity.getId() !== this.gameState.playerId &&
              existingEntity.hasExt(ClientPositionable)
            ) {
              const rawPos = existingEntity.getExt(ClientPositionable).getPosition();
              this.interpolation.addSnapshot(existingEntity.getId(), rawPos, timestamp);
              const smooth = this.interpolation.getInterpolatedPosition(existingEntity.getId());
              if (smooth) {
                existingEntity.getExt(ClientPositionable).setPosition(smooth);
              }
            }
          } else {
            // Add new entity
            const entityData = { id, type };
            const created = this.gameClient.getEntityFactory().createEntity(entityData);
            // Deserialize from buffer
            created.deserializeFromBuffer(reader.atOffset(entityStartOffset));

            if (created.getId() !== this.gameState.playerId && created.hasExt(ClientPositionable)) {
              const pos = created.getExt(ClientPositionable).getPosition();
              this.interpolation.addSnapshot(created.getId(), pos, timestamp);
            }
            // If new entity is my local player, seed the ghost position too
            if (
              created.getId() === this.gameState.playerId &&
              created.hasExt(ClientPositionable) &&
              created instanceof PlayerClient
            ) {
              const pos = created.getExt(ClientPositionable).getPosition();
              (created as unknown as PlayerClient).setServerGhostPosition(pos);
            }
            addEntity(this.gameState, created);
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
          const created = this.gameClient.getEntityFactory().createEntity(entity);
          // Seed interpolation snapshots for non-local players
          if (created.getId() !== this.gameState.playerId && created.hasExt(ClientPositionable)) {
            const pos = created.getExt(ClientPositionable).getPosition();
            this.interpolation.addSnapshot(created.getId(), pos, timestamp);
          }
          return created;
        });
        replaceAllEntities(this.gameState, createdEntities);

        if (!this.hasReceivedInitialState) {
          this.hasReceivedInitialState = true;
          this.checkInitialization();
        }
      } else {
        // Only process delta updates after we have initial state
        if (!this.hasReceivedInitialState) {
          return;
        }

        // Delta update - update only changed entities
        const removedIds = gameStateEvent.getRemovedEntityIds();

        // Remove entities that were deleted
        removedIds.forEach((id) => {
          removeEntityFromState(this.gameState, id);
        });

        // Update or add changed entities
        entitiesFromServer.forEach((serverEntityData) => {
          const existingEntity = this.gameState.entityMap.get(serverEntityData.id);
          if (existingEntity) {
            // Only update properties that were included in the delta update
            for (const [key, value] of Object.entries(serverEntityData)) {
              if (key !== "id") {
                // Skip the ID since it's used for lookup
                // For local player, avoid overriding client-predicted position unless necessary
                if (
                  existingEntity.getId() === this.gameState.playerId &&
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
              existingEntity.getId() !== this.gameState.playerId &&
              existingEntity.hasExt(ClientPositionable)
            ) {
              const rawPos = existingEntity.getExt(ClientPositionable).getPosition();
              this.interpolation.addSnapshot(existingEntity.getId(), rawPos, timestamp);
              const smooth = this.interpolation.getInterpolatedPosition(existingEntity.getId());
              if (smooth) {
                existingEntity.getExt(ClientPositionable).setPosition(smooth);
              }
            }
          } else {
            // Add new entity
            const created = this.gameClient.getEntityFactory().createEntity(serverEntityData);
            if (created.getId() !== this.gameState.playerId && created.hasExt(ClientPositionable)) {
              const pos = created.getExt(ClientPositionable).getPosition();
              this.interpolation.addSnapshot(created.getId(), pos, timestamp);
            }
            // If new entity is my local player, seed the ghost position too
            if (
              created.getId() === this.gameState.playerId &&
              created.hasExt(ClientPositionable) &&
              created instanceof PlayerClient
            ) {
              const pos = created.getExt(ClientPositionable).getPosition();
              (created as unknown as PlayerClient).setServerGhostPosition(pos);
            }
            addEntity(this.gameState, created);
          }
        });
      }
    }
  }

  private processPendingFullStateIfReady(): void {
    if (this.pendingFullStateEvent && this.hasReceivedMap && this.hasReceivedPlayerId) {
      const pendingEvent = this.pendingFullStateEvent;
      this.pendingFullStateEvent = null;
      this.handleGameStateUpdate(pendingEvent);
    }
  }

  onMap(mapEvent: MapEvent) {
    this.gameClient.getMapManager().setMap(mapEvent.getMapData());
    this.hasReceivedMap = true;
    this.processPendingFullStateIfReady();
    this.checkInitialization();
  }

  onYourId(yourIdEvent: YourIdEvent) {
    this.gameState.playerId = yourIdEvent.getPlayerId();
    this.hasReceivedPlayerId = true;
    this.processPendingFullStateIfReady();
    this.checkInitialization();
  }

  onZombieAttacked(zombieAttackedEvent: ZombieAttackedEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const zombie = this.gameClient.getEntityById(zombieAttackedEvent.getZombieId());
    if (!zombie) return;

    const zombieClient = zombie as unknown as ZombieClient;
    const zombiePosition = zombieClient.getCenterPosition().clone();

    // Play attack sounds
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.ZOMBIE_ATTACKED, zombiePosition);
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.ZOMBIE_HURT, zombiePosition);

    // Add swing animation
    const velocity = zombieClient.getVelocity();
    const facing = determineDirection(velocity) || Direction.Right;
    const particle = new SwipeParticle(this.gameClient.getImageLoader(), facing, "zombie");
    particle.setPosition(zombiePosition);
    this.gameClient.getParticleManager().addParticle(particle);
  }

  onPlayerHurt(playerHurtEvent: PlayerHurtEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const player = this.gameClient.getEntityById(playerHurtEvent.getPlayerId());
    if (!player || !(player instanceof PlayerClient)) return;

    const playerPosition = player.getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.PLAYER_HURT, playerPosition);

    // Interrupt teleport if local player takes damage
    const hurtPlayerId = playerHurtEvent.getPlayerId();
    const localPlayerId = this.gameClient.getGameState().playerId;

    // Compare IDs directly - if the hurt player is the local player, interrupt teleport
    if (localPlayerId && hurtPlayerId === localPlayerId) {
      this.gameClient.interruptTeleport();
    }
  }

  onGameOver(gameOverEvent: GameOverEvent) {
    this.gameClient.getGameOverDialog().show();
  }

  onLoot(lootEvent: LootEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const loot = this.gameClient.getEntityById(lootEvent.getEntityId());
    if (!loot) return;

    const positionable = loot.getExt(ClientPositionable);
    if (!positionable) return;

    const lootPosition = positionable.getCenterPosition();
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES_TO_MP3.LOOT, lootPosition);
  }

  onPlayerDeath(playerDeathEvent: PlayerDeathEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    this.gameClient.getHud().showPlayerDeath(playerDeathEvent.getDisplayName());

    const player = this.gameClient.getEntityById(playerDeathEvent.getPlayerId());
    if (!player || !(player instanceof PlayerClient)) return;

    const playerPosition = player.getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.PLAYER_DEATH, playerPosition);
  }

  onPlayerAttacked(playerAttackedEvent: PlayerAttackedEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const entity = this.gameClient.getEntityById(playerAttackedEvent.getPlayerId());
    if (!entity) return;

    const player = entity as unknown as PlayerClient;
    // Safety check: ensure player is actually a PlayerClient instance
    if (!(player instanceof PlayerClient) || typeof player.getInput !== "function") return;

    const playerPosition = player.getCenterPosition().clone();

    // Get weapon config to determine sound
    const weaponKey = playerAttackedEvent.getWeaponKey();
    const weaponConfig = weaponRegistry.get(weaponKey);

    this.applyWeaponCameraShake(playerAttackedEvent.getPlayerId(), weaponConfig);

    // Play weapon sound if configured
    if (weaponConfig?.sound) {
      this.gameClient
        .getSoundManager()
        .playPositionalSound(weaponConfig.sound as any, playerPosition);
    }

    // Show swipe animation for melee weapons
    if (weaponConfig?.type === "melee") {
      // Use attack direction from event if available, otherwise fall back to player facing
      const attackDirection = playerAttackedEvent.getAttackDirection() ?? player.getInput().facing;
      const particle = new SwipeParticle(
        this.gameClient.getImageLoader(),
        attackDirection,
        "player"
      );
      particle.setPosition(playerPosition);
      this.gameClient.getParticleManager().addParticle(particle);
    }
  }

  private applyWeaponCameraShake(attackingPlayerId: string, weaponConfig?: WeaponConfig) {
    const intensity = weaponConfig?.stats.cameraShakeIntensity;
    if (!intensity || intensity <= 0) {
      return;
    }

    const localPlayerId = this.gameClient.getGameState().playerId;
    if (!localPlayerId || localPlayerId !== attackingPlayerId) {
      return;
    }

    this.gameClient.shakeCamera(intensity, WEAPON_SHAKE_DURATION_MS);
  }

  private applyExplosionCameraShake(explosionPosition: Vector2) {
    const localPlayer = this.gameClient.getMyPlayer();
    if (!localPlayer) {
      return;
    }

    const playerPosition = localPlayer.getCenterPosition();
    const distToPlayer = distance(playerPosition, explosionPosition);
    if (distToPlayer > EXPLOSION_SHAKE_MAX_DISTANCE) {
      return;
    }

    const proximity = 1 - distToPlayer / EXPLOSION_SHAKE_MAX_DISTANCE;
    const intensity = EXPLOSION_SHAKE_MAX_INTENSITY * proximity;
    if (intensity > 0) {
      this.gameClient.shakeCamera(intensity, EXPLOSION_SHAKE_DURATION_MS);
    }
  }

  onZombieDeath(zombieDeathEvent: ZombieDeathEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const zombie = this.gameClient.getEntityById(zombieDeathEvent.getZombieId());
    if (!zombie) return;

    const zombiePosition = (zombie as unknown as ZombieClient).getCenterPosition();

    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.ZOMBIE_DEATH, zombiePosition);

    const localPlayer = this.gameClient.getMyPlayer();
    if (localPlayer) {
      const playerPosition = localPlayer.getCenterPosition();
      const distToPlayer = distance(playerPosition, zombiePosition);
      if (distToPlayer <= ZOMBIE_SHAKE_MAX_DISTANCE) {
        const proximity = 1 - distToPlayer / ZOMBIE_SHAKE_MAX_DISTANCE;
        const intensity = ZOMBIE_SHAKE_MAX_INTENSITY * proximity;
        if (intensity > 0) {
          this.gameClient.shakeCamera(intensity, ZOMBIE_SHAKE_DURATION_MS);
        }
      }
    }
  }

  onZombieHurt(zombieHurtEvent: ZombieHurtEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const zombie = this.gameClient.getEntityById(zombieHurtEvent.getZombieId());
    if (!zombie) return;

    const zombiePosition = (zombie as unknown as ZombieClient).getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.ZOMBIE_HURT, zombiePosition);
  }

  onPlayerDroppedItem(playerDroppedItemEvent: PlayerDroppedItemEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const player = this.gameClient.getEntityById(playerDroppedItemEvent.getPlayerId());
    if (!player || !(player instanceof PlayerClient)) return;

    const playerPosition = player.getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.DROP_ITEM, playerPosition);
  }

  onPlayerPickedUpItem(playerPickedUpItemEvent: PlayerPickedUpItemEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const player = this.gameClient.getEntityById(playerPickedUpItemEvent.getPlayerId());
    if (!player || !(player instanceof PlayerClient)) return;

    const playerPosition = player.getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.PICK_UP_ITEM, playerPosition);
  }

  onPlayerPickedUpResource(playerPickedUpResourceEvent: PlayerPickedUpResourceEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const player = this.gameClient.getEntityById(playerPickedUpResourceEvent.getPlayerId());
    if (!player || !(player instanceof PlayerClient)) return;

    const playerPosition = player.getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.PICK_UP_ITEM, playerPosition);
  }

  onGameStarted(gameStartedEvent: GameStartedEvent) {
    // Clear all client-side entities and particles
    clearEntities(this.gameState);
    this.gameClient.getParticleManager().clear();

    // Hide game over dialog if it was showing
    this.gameClient.getGameOverDialog().hide();

    // Show welcome message
    this.gameClient
      .getHud()
      .addMessage("The car is our only way out... don't let them destroy it!", "yellow");

    // Request full state from server
    this.socketManager.sendRequestFullState();
  }

  onPlayerJoined(playerJoinedEvent: PlayerJoinedEvent) {
    this.gameClient.getHud().showPlayerJoined(playerJoinedEvent.getDisplayName());
  }

  onChatMessage(chatMessageEvent: ChatMessageEvent) {
    this.gameClient
      .getHud()
      .addChatMessage(chatMessageEvent.getPlayerId(), chatMessageEvent.getMessage());
  }

  onGameMessage(gameMessageEvent: GameMessageEvent) {
    this.gameClient.getHud().addMessage(gameMessageEvent.getMessage(), gameMessageEvent.getColor());
  }

  onExplosion(event: ExplosionEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const particle = new ExplosionParticle(
      this.gameClient.getImageLoader(),
      this.gameClient.getSoundManager()
    );
    const serialized = event.serialize();
    const explosionPosition = new Vector2(serialized.position.x, serialized.position.y);
    particle.setPosition(explosionPosition);
    particle.onInitialized();
    this.gameClient.getParticleManager().addParticle(particle);

    this.applyExplosionCameraShake(explosionPosition);
  }

  onBossStep(event: BossStepEvent) {
    this.gameClient.shakeCamera(event.getIntensity(), event.getDurationMs());
  }

  onBossSummon(event: BossSummonEvent) {
    const summons = event.getSummons();
    summons.forEach((summon) => {
      const particle = new SummonParticle(
        this.gameClient.getImageLoader(),
        this.gameClient.getSoundManager()
      );
      particle.setPosition(new Vector2(summon.x, summon.y));
      particle.onInitialized();
      this.gameClient.getParticleManager().addParticle(particle);
    });
  }

  onCarRepair(carRepairEvent: CarRepairEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const car = this.gameClient.getEntityById(carRepairEvent.getCarId());
    if (!car || !car.hasExt(ClientPositionable)) return;

    const carPosition = car.getExt(ClientPositionable).getCenterPosition();
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES_TO_MP3.REPAIR, carPosition);
  }

  onWaveStart(waveStartEvent: WaveStartEvent) {
    // Play horn sound at player's position (or center if player doesn't exist)
    const myPlayer = this.gameClient.getMyPlayer();
    if (myPlayer && myPlayer.hasExt(ClientPositionable)) {
      const playerPosition = myPlayer.getExt(ClientPositionable).getCenterPosition();
      this.gameClient
        .getSoundManager()
        .playPositionalSound(SOUND_TYPES_TO_MP3.HORN, playerPosition);
    } else {
      // Fallback: play at origin if player doesn't exist yet
      const poolManager = PoolManager.getInstance();
      const fallbackPosition = poolManager.vector2.claim(0, 0);
      this.gameClient
        .getSoundManager()
        .playPositionalSound(SOUND_TYPES_TO_MP3.HORN, fallbackPosition);
    }

    // Kick off the round with a noticeable screen shake so players feel the threat ramping up
    this.gameClient.shakeCamera(WAVE_START_SHAKE_INTENSITY, WAVE_START_SHAKE_DURATION_MS);

    // Start battle music (plays on top of background music)
    this.gameClient.getSoundManager().playBattleMusic();
  }

  onCraft(craftEvent: CraftEvent) {
    if (!this.shouldProcessEntityEvent()) return;
    const player = this.gameClient.getEntityById(craftEvent.getPlayerId());
    if (!player || !player.hasExt(ClientPositionable)) return;

    const playerPosition = player.getExt(ClientPositionable).getCenterPosition();
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES_TO_MP3.CRAFT, playerPosition);
  }

  onBuild(buildEvent: BuildEvent) {
    const buildPosition = buildEvent.getPosition();
    const poolManager = PoolManager.getInstance();
    const position = poolManager.vector2.claim(buildPosition.x, buildPosition.y);
    const soundType = buildEvent.getSoundType() as SoundType;

    // Only play sound if it's a valid sound type
    if (soundType && Object.values(SOUND_TYPES_TO_MP3).includes(soundType as any)) {
      this.gameClient.getSoundManager().playPositionalSound(soundType, position);
    }
  }

  private checkInitialization() {
    if (this.isInitialized()) {
      // All required data received, start the game
      this.gameClient.start();
    }
  }
}
