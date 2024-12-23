import { MapEvent, PlayerDeathEvent, YourIdEvent } from "@survive-the-night/game-server";

import { GameStateEvent } from "@survive-the-night/game-server";

import { ServerSentEvents } from "@survive-the-night/game-server";
import { GameClient } from "./client";
import { ClientSocketManager } from "./managers/client-socket-manager";
import { GameState } from "./state";
import { SOUND_TYPES } from "@survive-the-night/game-server/src/shared/entities/sound";
import { PlayerClient } from "./entities/player";

export class ClientEventListener {
  private socketManager: ClientSocketManager;
  private gameClient: GameClient;
  private gameState: GameState;

  constructor(client: GameClient, socketManager: ClientSocketManager) {
    this.gameClient = client;
    this.socketManager = socketManager;
    this.gameState = this.gameClient.getGameState();

    this.socketManager.on(ServerSentEvents.GAME_STATE_UPDATE, (gameStateEvent: GameStateEvent) => {
      this.gameClient.setUpdatedEntitiesBuffer(gameStateEvent.getGameState().entities);
      this.gameState.dayNumber = gameStateEvent.getGameState().dayNumber;
      this.gameState.untilNextCycle = gameStateEvent.getGameState().untilNextCycle;
      this.gameState.isDay = gameStateEvent.getGameState().isDay;
    });

    this.socketManager.on(ServerSentEvents.PLAYER_DEATH, (playerDeathEvent: PlayerDeathEvent) => {
      this.gameClient.getHud().showPlayerDeath(playerDeathEvent.getPlayerId());

      const player = this.gameClient.getEntityById(playerDeathEvent.getPlayerId());
      if (!player) return;

      const playerPosition = (player as unknown as PlayerClient).getCenterPosition();

      this.gameClient
        .getSoundManager()
        .playPositionalSound(SOUND_TYPES.PLAYER_DEATH, playerPosition);
    });

    this.socketManager.on(ServerSentEvents.MAP, (mapEvent: MapEvent) => {
      this.gameClient.getMapManager().setMap(mapEvent.getMap());
    });

    this.socketManager.on(ServerSentEvents.YOUR_ID, (yourIdEvent: YourIdEvent) => {
      this.gameState.playerId = yourIdEvent.getPlayerId();
    });
  }
}
