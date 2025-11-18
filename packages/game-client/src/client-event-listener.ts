import { ServerSentEvents } from "@shared/events/events";
import { GameStateEvent } from "../../game-shared/src/events/server-sent/events/game-state-event";
import { GameClient } from "@/client";
import { ClientSocketManager } from "@/managers/client-socket-manager";
import { GameState } from "@/state";
import { InterpolationManager } from "@/managers/interpolation";
import { WaveState } from "@shared/types/wave";

import { onPlayerHurt } from "./events/on-player-hurt";
import { onPlayerDeath } from "./events/on-player-death";
import { onPlayerJoined } from "./events/on-player-joined";
import { onPlayerLeft } from "./events/on-player-left";
import { onPlayerAttacked } from "./events/on-player-attacked";
import { onZombieDeath } from "./events/on-zombie-death";
import { onZombieHurt } from "./events/on-zombie-hurt";
import { onZombieAttacked } from "./events/on-zombie-attacked";
import { onGunEmpty } from "./events/on-gun-empty";
import { onGunFired } from "./events/on-gun-fired";
import { onExplosion } from "./events/on-explosion";
import { onBossStep } from "./events/on-boss-step";
import { onBossSummon } from "./events/on-boss-summon";
import { onLoot } from "./events/on-loot";
import { onCoinPickup } from "./events/on-coin-pickup";
import { onPlayerDroppedItem } from "./events/on-player-dropped-item";
import { onPlayerPickedUpItem } from "./events/on-player-picked-up-item";
import { onPlayerPickedUpResource } from "./events/on-player-picked-up-resource";
import { onCarRepair } from "./events/on-car-repair";
import { onWaveStart } from "./events/on-wave-start";
import { onCraft } from "./events/on-craft";
import { onBuild } from "./events/on-build";
import { onGameOver } from "./events/on-game-over";
import { onGameStarted } from "./events/on-game-started";
import { onServerUpdating } from "./events/on-server-updating";
import { onPong } from "./events/on-pong";
import { handleDisconnect } from "./events/handle-disconnect";
import { onChatMessage } from "./events/on-chat-message";
import { onGameMessage } from "./events/on-game-message";
import { onGameStateUpdate } from "./events/on-game-state-update";
import { onMap } from "./events/on-map";
import { onYourId } from "./events/on-your-id";
import { ClientEventContext, InitializationContext } from "./events/types";

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

    const context = this.createContext();

    // Set up event listeners first, before requesting state
    // Create initialization context fresh each time to get current state values
    this.socketManager.on(ServerSentEvents.GAME_STATE_UPDATE, (e) =>
      onGameStateUpdate(this.createInitializationContext(), e)
    );
    this.socketManager.on(ServerSentEvents.MAP, (e) =>
      onMap(this.createInitializationContext(), e)
    );
    this.socketManager.on(ServerSentEvents.YOUR_ID, (e) =>
      onYourId(this.createInitializationContext(), e)
    );

    this.socketManager.on(ServerSentEvents.PLAYER_HURT, (e) => onPlayerHurt(context, e));
    this.socketManager.on(ServerSentEvents.PLAYER_DEATH, (e) => onPlayerDeath(context, e));
    this.socketManager.on(ServerSentEvents.PLAYER_JOINED, (e) => onPlayerJoined(context, e));
    this.socketManager.on(ServerSentEvents.PLAYER_ATTACKED, (e) => onPlayerAttacked(context, e));
    this.socketManager.on(ServerSentEvents.PLAYER_LEFT, (e) => onPlayerLeft(context, e));

    this.socketManager.on(ServerSentEvents.ZOMBIE_DEATH, (e) => onZombieDeath(context, e));
    this.socketManager.on(ServerSentEvents.ZOMBIE_HURT, (e) => onZombieHurt(context, e));
    this.socketManager.on(ServerSentEvents.ZOMBIE_ATTACKED, (e) => onZombieAttacked(context, e));

    this.socketManager.on(ServerSentEvents.GUN_EMPTY, (e) => onGunEmpty(context, e));
    this.socketManager.on(ServerSentEvents.GUN_FIRED, (e) => onGunFired(context, e));
    this.socketManager.on(ServerSentEvents.EXPLOSION, (e) => onExplosion(context, e));
    this.socketManager.on(ServerSentEvents.BOSS_STEP, (e) => onBossStep(context, e));
    this.socketManager.on(ServerSentEvents.BOSS_SUMMON, (e) => onBossSummon(context, e));

    this.socketManager.on(ServerSentEvents.LOOT, (e) => onLoot(context, e));
    this.socketManager.on(ServerSentEvents.COIN_PICKUP, (e) => onCoinPickup(context, e));
    this.socketManager.on(ServerSentEvents.PLAYER_DROPPED_ITEM, (e) =>
      onPlayerDroppedItem(context, e)
    );
    this.socketManager.on(ServerSentEvents.PLAYER_PICKED_UP_ITEM, (e) =>
      onPlayerPickedUpItem(context, e)
    );
    this.socketManager.on(ServerSentEvents.PLAYER_PICKED_UP_RESOURCE, (e) =>
      onPlayerPickedUpResource(context, e)
    );

    this.socketManager.on(ServerSentEvents.GAME_OVER, (e) => onGameOver(context, e));
    this.socketManager.on(ServerSentEvents.GAME_STARTED, (e) => onGameStarted(context, e));
    this.socketManager.on(ServerSentEvents.SERVER_UPDATING, (e) => onServerUpdating(context, e));
    this.socketManager.on(ServerSentEvents.PONG, (e) => onPong(context, e));

    this.socketManager.on(ServerSentEvents.CHAT_MESSAGE, (e) => onChatMessage(context, e));
    this.socketManager.on(ServerSentEvents.GAME_MESSAGE, (e) => onGameMessage(context, e));

    this.socketManager.on(ServerSentEvents.CAR_REPAIR, (e) => onCarRepair(context, e));
    this.socketManager.on(ServerSentEvents.WAVE_START, (e) => onWaveStart(context, e));
    this.socketManager.on(ServerSentEvents.CRAFT, (e) => onCraft(context, e));
    this.socketManager.on(ServerSentEvents.BUILD, (e) => onBuild(context, e));

    this.socketManager.onSocketDisconnect(() => {
      this.handleDisconnect();
    });
  }

  private createContext(): ClientEventContext {
    return {
      gameClient: this.gameClient,
      socketManager: this.socketManager,
      gameState: this.gameState,
      shouldProcessEntityEvent: this.shouldProcessEntityEvent.bind(this),
    };
  }

  private createInitializationContext(): InitializationContext {
    return {
      ...this.createContext(),
      interpolation: this.interpolation,
      previousWaveState: this.previousWaveState,
      pendingFullStateEvent: this.pendingFullStateEvent,
      hasReceivedMap: this.hasReceivedMap,
      hasReceivedPlayerId: this.hasReceivedPlayerId,
      hasReceivedInitialState: this.hasReceivedInitialState,
      setHasReceivedMap: (value: boolean) => {
        this.hasReceivedMap = value;
      },
      setHasReceivedPlayerId: (value: boolean) => {
        this.hasReceivedPlayerId = value;
      },
      setHasReceivedInitialState: (value: boolean) => {
        this.hasReceivedInitialState = value;
      },
      setPendingFullStateEvent: (event: GameStateEvent | null) => {
        this.pendingFullStateEvent = event;
      },
      setPreviousWaveState: (state: WaveState | undefined) => {
        this.previousWaveState = state;
      },
      processPendingFullStateIfReady: () => {
        this.processPendingFullStateIfReady();
      },
      checkInitialization: () => {
        this.checkInitialization();
      },
    };
  }

  private handleDisconnect(): void {
    // Reset initialization flags so we wait for fresh data on reconnect
    this.hasReceivedMap = false;
    this.hasReceivedPlayerId = false;
    this.hasReceivedInitialState = false;
    this.pendingFullStateEvent = null;

    // Handle side effects
    handleDisconnect(this.createContext());
  }

  private processPendingFullStateIfReady(): void {
    if (this.pendingFullStateEvent && this.hasReceivedMap && this.hasReceivedPlayerId) {
      const pendingEvent = this.pendingFullStateEvent;
      this.pendingFullStateEvent = null;
      const initContext = this.createInitializationContext();
      onGameStateUpdate(initContext, pendingEvent);
    }
  }

  private checkInitialization() {
    if (this.isInitialized()) {
      // All required data received, start the game
      this.gameClient.start();
    }
  }
}
