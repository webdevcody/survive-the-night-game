import { ServerSentEvents, ClientSentEvents } from "@shared/events/events";
import { GameOverEvent } from "@shared/events/server-sent/game-over-event";
import { GameStateEvent } from "@shared/events/server-sent/game-state-event";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { LootEvent } from "@shared/events/server-sent/loot-event";
import { MapEvent } from "@shared/events/server-sent/map-event";
import { WEAPON_TYPES } from "@shared/types/weapons";
import { PlayerPickedUpItemEvent } from "@shared/events/server-sent/pickup-item-event";
import { PlayerAttackedEvent } from "@shared/events/server-sent/player-attacked-event";
import { PlayerDeathEvent } from "@shared/events/server-sent/player-death-event";
import { PlayerDroppedItemEvent } from "@shared/events/server-sent/player-dropped-item-event";
import { PlayerHurtEvent } from "@shared/events/server-sent/player-hurt-event";
import { YourIdEvent } from "@shared/events/server-sent/your-id-event";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import { ZombieHurtEvent } from "@shared/events/server-sent/zombie-hurt-event";
import { GameClient } from "@/client";
import { PlayerClient } from "@/entities/player";
import { ZombieClient } from "@/entities/zombie";
import { ClientPositionable } from "@/extensions";
import { ClientSocketManager } from "@/managers/client-socket-manager";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { GameState } from "@/state";
import { SwipeParticle } from "./particles/swipe";
import { Direction, determineDirection } from "@shared/util/direction";
import { GameStartedEvent } from "@shared/events/server-sent/game-started-event";
import { PlayerJoinedEvent } from "@shared/events/server-sent/player-joined-event";
import { ServerUpdatingEvent } from "@shared/events/server-sent/server-updating-event";
import { ChatMessageEvent } from "@shared/events/server-sent/chat-message-event";
import { PlayerLeftEvent } from "@shared/events/server-sent/player-left-event";
import { ExplosionParticle } from "./particles/explosion";
import { ExplosionEvent } from "@shared/events/server-sent/explosion-event";

export class ClientEventListener {
  private socketManager: ClientSocketManager;
  private gameClient: GameClient;
  private gameState: GameState;
  private hasReceivedMap = false;
  private hasReceivedPlayerId = false;
  private hasReceivedInitialState = false;

  private isInitialized(): boolean {
    return this.hasReceivedMap && this.hasReceivedPlayerId && this.hasReceivedInitialState;
  }

  constructor(client: GameClient, socketManager: ClientSocketManager) {
    this.gameClient = client;
    this.socketManager = socketManager;
    this.gameState = this.gameClient.getGameState();

    // Prevent game from starting until we're initialized
    this.gameClient.stop();

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
    this.socketManager.on(ServerSentEvents.LOOT, this.onLoot.bind(this));
    this.socketManager.on(ServerSentEvents.ZOMBIE_ATTACKED, this.onZombieAttacked.bind(this));
    this.socketManager.on(ServerSentEvents.GAME_OVER, this.onGameOver.bind(this));
    this.socketManager.on(ServerSentEvents.GAME_STARTED, this.onGameStarted.bind(this));
    this.socketManager.on(ServerSentEvents.PLAYER_LEFT, this.onPlayerLeft.bind(this));
    this.socketManager.on(ServerSentEvents.SERVER_UPDATING, this.onServerUpdating.bind(this));
    this.socketManager.on(ServerSentEvents.CHAT_MESSAGE, this.onChatMessage.bind(this));
    this.socketManager.on(
      ServerSentEvents.PLAYER_DROPPED_ITEM,
      this.onPlayerDroppedItem.bind(this)
    );
    this.socketManager.on(
      ServerSentEvents.PLAYER_PICKED_UP_ITEM,
      this.onPlayerPickedUpItem.bind(this)
    );
    this.socketManager.on(ServerSentEvents.EXPLOSION, this.onExplosion.bind(this));
  }

  onServerUpdating(serverUpdatingEvent: ServerUpdatingEvent) {
    this.gameClient.getHud().addMessage("Server is updating, you will be reconnected shortly...");
  }

  onGunEmpty(gunEmptyEvent: GunEmptyEvent) {
    const player = this.gameClient.getEntityById(gunEmptyEvent.getEntityId());
    if (!player) return;

    const playerPosition = (player as unknown as PlayerClient).getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.GUN_EMPTY, playerPosition);
  }

  onPlayerLeft(playerLeftEvent: PlayerLeftEvent) {
    this.gameClient.getHud().addMessage(`${playerLeftEvent.getPlayerId()} left the game`);
    this.gameClient.removeEntity(playerLeftEvent.getPlayerId());
  }

  onGameStateUpdate(gameStateEvent: GameStateEvent) {
    // Only process state updates once we have map and player ID
    if (!this.hasReceivedMap || !this.hasReceivedPlayerId) {
      return;
    }

    const entities = gameStateEvent.getEntities();

    // Update game state properties only if they are included in the update
    if (gameStateEvent.getDayNumber() !== undefined) {
      this.gameState.dayNumber = gameStateEvent.getDayNumber()!;
    }
    if (gameStateEvent.getCycleStartTime() !== undefined) {
      this.gameState.cycleStartTime = gameStateEvent.getCycleStartTime()!;
    }
    if (gameStateEvent.getCycleDuration() !== undefined) {
      this.gameState.cycleDuration = gameStateEvent.getCycleDuration()!;
    }
    if (gameStateEvent.getIsDay() !== undefined) {
      this.gameState.isDay = gameStateEvent.getIsDay()!;
    }

    if (gameStateEvent.isFullState()) {
      // Full state update - replace all entities
      this.gameState.entities = entities.map((entity) => {
        return this.gameClient.getEntityFactory().createEntity(entity);
      });

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
      this.gameState.entities = this.gameState.entities.filter(
        (entity) => !removedIds.includes(entity.getId())
      );

      // Update or add changed entities
      entities.forEach((entityData) => {
        const existingEntity = this.gameState.entities.find((e) => e.getId() === entityData.id);
        if (existingEntity) {
          // Only update properties that were included in the delta update
          for (const [key, value] of Object.entries(entityData)) {
            if (key !== "id") {
              // Skip the ID since it's used for lookup
              existingEntity.deserializeProperty(key, value);
            }
          }
        } else {
          // Add new entity
          this.gameState.entities.push(this.gameClient.getEntityFactory().createEntity(entityData));
        }
      });
    }
  }

  onMap(mapEvent: MapEvent) {
    this.gameClient.getMapManager().setMap(mapEvent.getMap());
    this.hasReceivedMap = true;
    this.checkInitialization();
  }

  onYourId(yourIdEvent: YourIdEvent) {
    this.gameState.playerId = yourIdEvent.getPlayerId();
    this.hasReceivedPlayerId = true;
    this.checkInitialization();
  }

  onZombieAttacked(zombieAttackedEvent: ZombieAttackedEvent) {
    const zombie = this.gameClient.getEntityById(zombieAttackedEvent.getZombieId());
    if (!zombie) return;

    const zombieClient = zombie as unknown as ZombieClient;
    const zombiePosition = zombieClient.getCenterPosition();

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
    const player = this.gameClient.getEntityById(playerHurtEvent.getPlayerId());
    if (!player) return;

    const playerPosition = (player as unknown as PlayerClient).getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.PLAYER_HURT, playerPosition);
  }

  onGameOver(gameOverEvent: GameOverEvent) {
    this.gameClient.getGameOverDialog().show();
  }

  onLoot(lootEvent: LootEvent) {
    const loot = this.gameClient.getEntityById(lootEvent.getEntityId());
    if (!loot) return;

    const positionable = loot.getExt(ClientPositionable);
    if (!positionable) return;

    const lootPosition = positionable.getCenterPosition();
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES_TO_MP3.LOOT, lootPosition);
  }

  onPlayerDeath(playerDeathEvent: PlayerDeathEvent) {
    this.gameClient.getHud().showPlayerDeath(playerDeathEvent.getPlayerId());

    const player = this.gameClient.getEntityById(playerDeathEvent.getPlayerId());
    if (!player) return;

    const playerPosition = (player as unknown as PlayerClient).getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.PLAYER_DEATH, playerPosition);
  }

  onPlayerAttacked(playerAttackedEvent: PlayerAttackedEvent) {
    const entity = this.gameClient.getEntityById(playerAttackedEvent.getPlayerId());
    if (!entity) return;

    const player = entity as unknown as PlayerClient;
    const playerPosition = player.getCenterPosition();

    const soundMap = {
      [WEAPON_TYPES.PISTOL]: SOUND_TYPES_TO_MP3.PISTOL,
      [WEAPON_TYPES.SHOTGUN]: SOUND_TYPES_TO_MP3.SHOTGUN_FIRE,
      [WEAPON_TYPES.KNIFE]: SOUND_TYPES_TO_MP3.KNIFE_ATTACK,
    };
    this.gameClient
      .getSoundManager()
      .playPositionalSound(soundMap[playerAttackedEvent.getWeaponKey()], playerPosition);

    // Only show swipe animation for knife attacks
    if (playerAttackedEvent.getWeaponKey() === WEAPON_TYPES.KNIFE) {
      const particle = new SwipeParticle(
        this.gameClient.getImageLoader(),
        player.getInput().facing,
        "player"
      );
      particle.setPosition(playerPosition);
      this.gameClient.getParticleManager().addParticle(particle);
    }
  }

  onZombieDeath(zombieDeathEvent: ZombieDeathEvent) {
    const zombie = this.gameClient.getEntityById(zombieDeathEvent.getZombieId());
    if (!zombie) return;

    const zombiePosition = (zombie as unknown as ZombieClient).getCenterPosition();

    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.ZOMBIE_DEATH, zombiePosition);
  }

  onZombieHurt(zombieHurtEvent: ZombieHurtEvent) {
    const zombie = this.gameClient.getEntityById(zombieHurtEvent.getZombieId());
    if (!zombie) return;

    const zombiePosition = (zombie as unknown as ZombieClient).getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.ZOMBIE_HURT, zombiePosition);
  }

  onPlayerDroppedItem(playerDroppedItemEvent: PlayerDroppedItemEvent) {
    const player = this.gameClient.getEntityById(playerDroppedItemEvent.getPlayerId());
    if (!player) return;

    const playerPosition = (player as unknown as PlayerClient).getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.DROP_ITEM, playerPosition);
  }

  onPlayerPickedUpItem(playerPickedUpItemEvent: PlayerPickedUpItemEvent) {
    const player = this.gameClient.getEntityById(playerPickedUpItemEvent.getPlayerId());
    if (!player) return;

    const playerPosition = (player as unknown as PlayerClient).getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.PICK_UP_ITEM, playerPosition);
  }

  onGameStarted(gameStartedEvent: GameStartedEvent) {
    // Clear all client-side entities and particles
    this.gameState.entities = [];
    this.gameClient.getParticleManager().clear();

    // Hide game over dialog if it was showing
    this.gameClient.getGameOverDialog().hide();

    // Request full state from server
    this.socketManager.sendRequestFullState();
  }

  onPlayerJoined(playerJoinedEvent: PlayerJoinedEvent) {
    this.gameClient.getHud().showPlayerJoined(playerJoinedEvent.getPlayerId());
  }

  onChatMessage(chatMessageEvent: ChatMessageEvent) {
    this.gameClient
      .getHud()
      .addChatMessage(chatMessageEvent.getPlayerId(), chatMessageEvent.getMessage());
  }

  onExplosion(event: ExplosionEvent) {
    const particle = new ExplosionParticle(this.gameClient.getImageLoader());
    particle.setPosition(event.serialize().position);
    this.gameClient.getParticleManager().addParticle(particle);
  }

  private checkInitialization() {
    if (this.isInitialized()) {
      // All required data received, start the game
      this.gameClient.start();
    }
  }
}
