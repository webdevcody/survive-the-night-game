import { GameClient } from "./client";
import { ClientSocketManager } from "./managers/client-socket-manager";
import { GameState } from "./state";
import { PlayerClient } from "./entities/player";
import { PlayerHurtEvent } from "@survive-the-night/game-server/src/events/server-sent/player-hurt-event";
import { PlayerAttackedEvent } from "@survive-the-night/game-server/src/events/server-sent/player-attacked-event";
import { ZombieDeathEvent } from "@survive-the-night/game-server/src/events/server-sent/zombie-death-event";
import { ZombieClient } from "./entities/zombie";
import { ZombieHurtEvent } from "@survive-the-night/game-server/src/events/server-sent/zombie-hurt-event";
import { PlayerDroppedItemEvent } from "@survive-the-night/game-server/src/events/server-sent/player-dropped-item-event";
import { PlayerPickedUpItemEvent } from "@survive-the-night/game-server/src/events/server-sent/pickup-item-event";
import { GameOverEvent } from "@survive-the-night/game-server/src/events/server-sent/game-over-event";
import { SOUND_TYPES } from "./managers/sound-manager";
import { WEAPON_TYPES } from "@survive-the-night/game-server/src/entities/weapons/weapon";
import { ZombieAttackedEvent } from "@survive-the-night/game-server/src/events/server-sent/zombie-attacked-event";
import { LootEvent } from "@survive-the-night/game-server/src/events/server-sent/loot-event";
import { ClientPositionable } from "./extensions";
import { GunEmptyEvent } from "@survive-the-night/game-server/src/events/server-sent/gun-empty-event";
import { ServerSentEvents } from "@survive-the-night/game-server/src/events/events";
import { GameStateEvent } from "@server/events/server-sent/game-state-event";
import { MapEvent } from "@server/events/server-sent/map-event";
import { PlayerDeathEvent } from "@server/events/server-sent/player-death-event";
import { YourIdEvent } from "@server/events/server-sent/your-id-event";

export class ClientEventListener {
  private socketManager: ClientSocketManager;
  private gameClient: GameClient;
  private gameState: GameState;

  constructor(client: GameClient, socketManager: ClientSocketManager) {
    this.gameClient = client;
    this.socketManager = socketManager;
    this.gameState = this.gameClient.getGameState();

    this.socketManager.on(ServerSentEvents.GAME_STATE_UPDATE, this.onGameStateUpdate.bind(this));
    this.socketManager.on(ServerSentEvents.MAP, this.onMap.bind(this));
    this.socketManager.on(ServerSentEvents.YOUR_ID, this.onYourId.bind(this));
    this.socketManager.on(ServerSentEvents.PLAYER_HURT, this.onPlayerHurt.bind(this));
    this.socketManager.on(ServerSentEvents.PLAYER_DEATH, this.onPlayerDeath.bind(this));
    this.socketManager.on(ServerSentEvents.PLAYER_ATTACKED, this.onPlayerAttacked.bind(this));
    this.socketManager.on(ServerSentEvents.ZOMBIE_DEATH, this.onZombieDeath.bind(this));
    this.socketManager.on(ServerSentEvents.ZOMBIE_HURT, this.onZombieHurt.bind(this));
    this.socketManager.on(ServerSentEvents.GUN_EMPTY, this.onGunEmpty.bind(this));
    this.socketManager.on(ServerSentEvents.LOOT, this.onLoot.bind(this));
    this.socketManager.on(ServerSentEvents.ZOMBIE_ATTACKED, this.onZombieAttacked.bind(this));
    this.socketManager.on(ServerSentEvents.GAME_OVER, this.onGameOver.bind(this));
    this.socketManager.on(
      ServerSentEvents.PLAYER_DROPPED_ITEM,
      this.onPlayerDroppedItem.bind(this)
    );
    this.socketManager.on(
      ServerSentEvents.PLAYER_PICKED_UP_ITEM,
      this.onPlayerPickedUpItem.bind(this)
    );
  }

  onGunEmpty(gunEmptyEvent: GunEmptyEvent) {
    const player = this.gameClient.getEntityById(gunEmptyEvent.getEntityId());
    if (!player) return;

    const playerPosition = (player as unknown as PlayerClient).getCenterPosition();
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES.GUN_EMPTY, playerPosition);
  }

  onGameStateUpdate(gameStateEvent: GameStateEvent) {
    this.gameClient.setUpdatedEntitiesBuffer(gameStateEvent.getGameState().entities);
    this.gameState.dayNumber = gameStateEvent.getGameState().dayNumber;
    this.gameState.untilNextCycle = gameStateEvent.getGameState().untilNextCycle;
    this.gameState.isDay = gameStateEvent.getGameState().isDay;
  }

  onMap(mapEvent: MapEvent) {
    this.gameClient.getMapManager().setMap(mapEvent.getMap());
  }

  onYourId(yourIdEvent: YourIdEvent) {
    this.gameState.playerId = yourIdEvent.getPlayerId();
  }

  onZombieAttacked(zombieAttackedEvent: ZombieAttackedEvent) {
    const zombie = this.gameClient.getEntityById(zombieAttackedEvent.getZombieId());
    if (!zombie) return;

    const zombiePosition = (zombie as unknown as ZombieClient).getCenterPosition();
    this.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES.ZOMBIE_ATTACKED, zombiePosition);
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES.ZOMBIE_HURT, zombiePosition);
  }

  onPlayerHurt(playerHurtEvent: PlayerHurtEvent) {
    const player = this.gameClient.getEntityById(playerHurtEvent.getPlayerId());
    if (!player) return;

    const playerPosition = (player as unknown as PlayerClient).getCenterPosition();
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES.PLAYER_HURT, playerPosition);
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
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES.LOOT, lootPosition);
  }

  onPlayerDeath(playerDeathEvent: PlayerDeathEvent) {
    this.gameClient.getHud().showPlayerDeath(playerDeathEvent.getPlayerId());

    const player = this.gameClient.getEntityById(playerDeathEvent.getPlayerId());
    if (!player) return;

    const playerPosition = (player as unknown as PlayerClient).getCenterPosition();
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES.PLAYER_DEATH, playerPosition);
  }

  onPlayerAttacked(playerAttackedEvent: PlayerAttackedEvent) {
    const player = this.gameClient.getEntityById(playerAttackedEvent.getPlayerId());
    if (!player) return;

    const playerPosition = (player as unknown as PlayerClient).getCenterPosition();

    if (playerAttackedEvent.getWeaponKey() === WEAPON_TYPES.PISTOL) {
      this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES.PISTOL, playerPosition);
    } else if (playerAttackedEvent.getWeaponKey() === WEAPON_TYPES.SHOTGUN) {
      this.gameClient
        .getSoundManager()
        .playPositionalSound(SOUND_TYPES.SHOTGUN_FIRE, playerPosition);
    }
  }

  onZombieDeath(zombieDeathEvent: ZombieDeathEvent) {
    const zombie = this.gameClient.getEntityById(zombieDeathEvent.getZombieId());
    if (!zombie) return;

    const zombiePosition = (zombie as unknown as ZombieClient).getCenterPosition();

    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES.ZOMBIE_DEATH, zombiePosition);
  }

  onZombieHurt(zombieHurtEvent: ZombieHurtEvent) {
    const zombie = this.gameClient.getEntityById(zombieHurtEvent.getZombieId());
    if (!zombie) return;

    const zombiePosition = (zombie as unknown as ZombieClient).getCenterPosition();
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES.ZOMBIE_HURT, zombiePosition);
  }

  onPlayerDroppedItem(playerDroppedItemEvent: PlayerDroppedItemEvent) {
    const player = this.gameClient.getEntityById(playerDroppedItemEvent.getPlayerId());
    if (!player) return;

    const playerPosition = (player as unknown as PlayerClient).getCenterPosition();
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES.DROP_ITEM, playerPosition);
  }

  onPlayerPickedUpItem(playerPickedUpItemEvent: PlayerPickedUpItemEvent) {
    const player = this.gameClient.getEntityById(playerPickedUpItemEvent.getPlayerId());
    if (!player) return;

    const playerPosition = (player as unknown as PlayerClient).getCenterPosition();
    this.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES.PICK_UP_ITEM, playerPosition);
  }
}
