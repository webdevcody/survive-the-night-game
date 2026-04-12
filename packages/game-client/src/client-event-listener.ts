import { ServerSentEvents } from "@shared/events/events";
import { GameStateEvent } from "../../game-shared/src/events/server-sent/events/game-state-event";
import { YourIdEvent } from "../../game-shared/src/events/server-sent/events/your-id-event";
import { GameClient } from "@/client";
import { ClientSocketManager } from "@/managers/client-socket-manager";
import { GameState } from "@/state";
import { InterpolationManager } from "@/managers/interpolation";
import { onPlayerHurt } from "./events/on-player-hurt";
import { onPlayerDeath } from "./events/on-player-death";
import { onPlayerLeft } from "./events/on-player-left";
import { onPlayerAttacked } from "./events/on-player-attacked";
import { onZombieDeath } from "./events/on-zombie-death";
import { onZombieHurt } from "./events/on-zombie-hurt";
import { onZombieAttacked } from "./events/on-zombie-attacked";
import { onZombieAlerted } from "./events/on-zombie-alerted";
import { onGunEmpty } from "./events/on-gun-empty";
import { onGunFired } from "./events/on-gun-fired";
import { onExplosion } from "./events/on-explosion";
import { onBossStep } from "./events/on-boss-step";
import { onBossSummon } from "./events/on-boss-summon";
import { onBossSplit } from "./events/on-boss-split";
import { onLoot } from "./events/on-loot";
import { onCoinPickup } from "./events/on-coin-pickup";
import { onPlayerDroppedItem } from "./events/on-player-dropped-item";
import { onPlayerPickedUpItem } from "./events/on-player-picked-up-item";
import { onCarRepair } from "./events/on-car-repair";
import { onCraft } from "./events/on-craft";
import { onBuild } from "./events/on-build";
import { onGameStarted } from "./events/on-game-started";
import { onServerUpdating } from "./events/on-server-updating";
import { onPong } from "./events/on-pong";
import { handleDisconnect } from "./events/handle-disconnect";
import { onChatMessage } from "./events/on-chat-message";
import { onGameMessage } from "./events/on-game-message";
import { applyGameStateUpdateBuffer } from "./events/on-game-state-update";
import { onVersionMismatch } from "./events/on-version-mismatch";
import { onAuthRequired } from "./events/on-auth-required";
import { onProfileLoadFailed } from "./events/on-profile-load-failed";
import { onPlayerLevelUp } from "./events/on-player-level-up";
import { onUserBanned } from "./events/on-user-banned";
import {
  ClientEventContext,
  GameStateUpdateContext,
  InitializationContext,
} from "./events/types";

type ConnectionLifecycle = "disconnected" | "awaitingIdentity" | "awaitingFullState" | "ready";

export class ClientEventListener {
  private socketManager: ClientSocketManager;
  private gameClient: GameClient;
  private gameState: GameState;
  private hasReceivedPlayerId = false;
  private hasReceivedInitialState = false;
  private interpolation: InterpolationManager = new InterpolationManager();
  private fullStateRequestTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingFullStateEvent: GameStateEvent | null = null;
  private connectionLifecycle: ConnectionLifecycle = "disconnected";

  private isInitialized(): boolean {
    return this.hasReceivedPlayerId && this.hasReceivedInitialState;
  }

  private shouldProcessEntityEvent(): boolean {
    return this.hasReceivedInitialState;
  }

  constructor(client: GameClient, socketManager: ClientSocketManager) {
    this.gameClient = client;
    this.socketManager = socketManager;
    this.gameState = this.gameClient.getGameState();

    const context = this.createContext();

    this.socketManager.on(ServerSentEvents.GAME_STATE_UPDATE, (e) => this.routeGameStateUpdate(e));
    this.socketManager.on(ServerSentEvents.YOUR_ID, (e) => this.handleYourId(e));

    this.socketManager.on(ServerSentEvents.PLAYER_HURT, (e) => onPlayerHurt(context, e));
    this.socketManager.on(ServerSentEvents.PLAYER_DEATH, (e) => onPlayerDeath(context, e));
    this.socketManager.on(ServerSentEvents.PLAYER_ATTACKED, (e) => onPlayerAttacked(context, e));
    this.socketManager.on(ServerSentEvents.PLAYER_LEFT, (e) => onPlayerLeft(context, e));

    this.socketManager.on(ServerSentEvents.ZOMBIE_DEATH, (e) => onZombieDeath(context, e));
    this.socketManager.on(ServerSentEvents.ZOMBIE_HURT, (e) => onZombieHurt(context, e));
    this.socketManager.on(ServerSentEvents.ZOMBIE_ATTACKED, (e) => onZombieAttacked(context, e));
    this.socketManager.on(ServerSentEvents.ZOMBIE_ALERTED, (e) => onZombieAlerted(context, e));

    this.socketManager.on(ServerSentEvents.GUN_EMPTY, (e) => onGunEmpty(context, e));
    this.socketManager.on(ServerSentEvents.GUN_FIRED, (e) => onGunFired(context, e));
    this.socketManager.on(ServerSentEvents.EXPLOSION, (e) => onExplosion(context, e));
    this.socketManager.on(ServerSentEvents.BOSS_STEP, (e) => onBossStep(context, e));
    this.socketManager.on(ServerSentEvents.BOSS_SUMMON, (e) => onBossSummon(context, e));
    this.socketManager.on(ServerSentEvents.BOSS_SPLIT, (e) => onBossSplit(context, e));

    this.socketManager.on(ServerSentEvents.LOOT, (e) => onLoot(context, e));
    this.socketManager.on(ServerSentEvents.COIN_PICKUP, (e) => onCoinPickup(context, e));
    this.socketManager.on(ServerSentEvents.PLAYER_DROPPED_ITEM, (e) =>
      onPlayerDroppedItem(context, e),
    );
    this.socketManager.on(ServerSentEvents.PLAYER_PICKED_UP_ITEM, (e) =>
      onPlayerPickedUpItem(context, e),
    );
    this.socketManager.on(ServerSentEvents.GAME_STARTED, (e) =>
      onGameStarted(this.createInitializationContext(), e),
    );
    this.socketManager.on(ServerSentEvents.SERVER_UPDATING, (e) => onServerUpdating(context, e));
    this.socketManager.on(ServerSentEvents.PONG, (e) => onPong(context, e));

    this.socketManager.on(ServerSentEvents.CHAT_MESSAGE, (e) => onChatMessage(context, e));
    this.socketManager.on(ServerSentEvents.GAME_MESSAGE, (e) => onGameMessage(context, e));

    this.socketManager.on(ServerSentEvents.CAR_REPAIR, (e) => onCarRepair(context, e));
    this.socketManager.on(ServerSentEvents.CRAFT, (e) => onCraft(context, e));
    this.socketManager.on(ServerSentEvents.BUILD, (e) => onBuild(context, e));
    this.socketManager.on(ServerSentEvents.VERSION_MISMATCH, (e) => onVersionMismatch(context, e));
    this.socketManager.on(ServerSentEvents.AUTH_REQUIRED, (e) => onAuthRequired(context, e));
    this.socketManager.on(ServerSentEvents.PROFILE_LOAD_FAILED, (e) =>
      onProfileLoadFailed(context, e),
    );
    this.socketManager.on(ServerSentEvents.PLAYER_LEVEL_UP, (e) => onPlayerLevelUp(context, e));
    this.socketManager.on(ServerSentEvents.USER_BANNED, (e) => onUserBanned(context, e));
    this.socketManager.onSocketDisconnect(() => {
      this.handleSocketDisconnect();
    });

    this.socketManager.setReconnectResyncHandler(() => {
      this.requestInitializationAfterReconnect();
    });
  }

  /**
   * Call after the transport has connected. Server pushes YOUR_ID + full state on connect;
   * reconnect uses {@link requestInitializationAfterReconnect} instead.
   */
  public onTransportConnected(): void {
    this.connectionLifecycle = "awaitingIdentity";
  }

  private buildGameStateApplyContext(): GameStateUpdateContext {
    return {
      gameClient: this.gameClient,
      gameState: this.gameState,
      interpolation: this.interpolation,
      hasReceivedPlayerId: this.hasReceivedPlayerId,
      hasReceivedInitialState: this.hasReceivedInitialState,
      setHasReceivedInitialState: (value: boolean, reason?: string) => {
        const changed = this.hasReceivedInitialState !== value;
        this.hasReceivedInitialState = value;
        if (!changed) {
          return;
        }
        if (value) {
          this.clearFullStateRequestTimer("Initial full state applied");
        } else {
          this.invalidateInitialState(reason ?? "Initial state flag reset");
        }
      },
      checkInitialization: () => this.checkInitialization(),
    };
  }

  private routeGameStateUpdate(gameStateEvent: GameStateEvent): void {
    if (
      !gameStateEvent.isFullState() &&
      (!this.hasReceivedPlayerId || !this.hasReceivedInitialState)
    ) {
      return;
    }

    if (gameStateEvent.isFullState() && !this.hasReceivedPlayerId) {
      this.pendingFullStateEvent = gameStateEvent;
      return;
    }

    applyGameStateUpdateBuffer(this.buildGameStateApplyContext(), gameStateEvent);
    this.syncLifecycleAfterBuffer();
  }

  private handleYourId(yourIdEvent: YourIdEvent): void {
    this.gameState.playerId = yourIdEvent.getPlayerId();
    this.gameState.gameMode = yourIdEvent.getGameMode();
    this.hasReceivedPlayerId = true;
    this.connectionLifecycle = "awaitingFullState";

    this.flushPendingFullStateAfterYourId();

    if (!this.hasReceivedInitialState) {
      this.requestFullState("your id received");
    }
    this.checkInitialization();
    this.syncLifecycleAfterBuffer();
  }

  private flushPendingFullStateAfterYourId(): void {
    if (!this.pendingFullStateEvent) {
      return;
    }
    const e = this.pendingFullStateEvent;
    this.pendingFullStateEvent = null;
    applyGameStateUpdateBuffer(this.buildGameStateApplyContext(), e);
    this.syncLifecycleAfterBuffer();
  }

  private syncLifecycleAfterBuffer(): void {
    if (this.connectionLifecycle === "disconnected") {
      return;
    }
    if (this.hasReceivedPlayerId && this.hasReceivedInitialState) {
      this.connectionLifecycle = "ready";
    } else if (this.hasReceivedPlayerId) {
      this.connectionLifecycle = "awaitingFullState";
    } else {
      this.connectionLifecycle = "awaitingIdentity";
    }
  }

  private createContext(): ClientEventContext {
    return {
      gameClient: this.gameClient,
      socketManager: this.socketManager,
      gameState: this.gameState,
      shouldProcessEntityEvent: this.shouldProcessEntityEvent.bind(this),
      requestFullState: this.requestFullState.bind(this),
      invalidateInitialState: this.invalidateInitialState.bind(this),
    };
  }

  private createInitializationContext(): InitializationContext {
    return {
      ...this.createContext(),
      ...this.buildGameStateApplyContext(),
      setHasReceivedPlayerId: (value: boolean) => {
        this.hasReceivedPlayerId = value;
      },
      queuePendingFullState: (event: GameStateEvent) => {
        this.pendingFullStateEvent = event;
      },
      flushPendingFullStateAfterYourId: () => this.flushPendingFullStateAfterYourId(),
      resetAndRequestInitialization: (reason: string) => {
        this.resetAndRequestInitialization(reason);
      },
    };
  }

  private handleSocketDisconnect(): void {
    this.pendingFullStateEvent = null;
    this.connectionLifecycle = "disconnected";
    this.invalidateInitialState("Socket disconnected");
    this.hasReceivedPlayerId = false;
    this.gameState.playerId = 0;

    handleDisconnect(this.createContext());
  }

  private requestFullState(reason: string = "manual"): void {
    this.socketManager.sendRequestFullState();
    this.scheduleFullStateTimeout();
  }

  private scheduleFullStateTimeout(): void {
    if (this.fullStateRequestTimer) {
      clearTimeout(this.fullStateRequestTimer);
    }
    this.fullStateRequestTimer = setTimeout(() => {
      if (this.hasReceivedInitialState) {
        this.clearFullStateRequestTimer();
        return;
      }

      this.socketManager.sendRequestFullState();
      this.scheduleFullStateTimeout();
    }, 4000);
  }

  private clearFullStateRequestTimer(_message?: string): void {
    if (this.fullStateRequestTimer) {
      clearTimeout(this.fullStateRequestTimer);
      this.fullStateRequestTimer = null;
    }
  }

  private invalidateInitialState(reason: string = "unspecified"): void {
    this.hasReceivedInitialState = false;
    this.pendingFullStateEvent = null;
    this.interpolation.reset();
    this.clearFullStateRequestTimer();
  }

  private resetAndRequestInitialization(reason: string): void {
    this.hasReceivedPlayerId = false;
    this.hasReceivedInitialState = false;
    this.pendingFullStateEvent = null;
    this.gameState.playerId = 0;
    this.interpolation.reset();
    this.clearFullStateRequestTimer();
    this.connectionLifecycle = "awaitingIdentity";

    this.socketManager.requestPlayerId();
    this.requestFullState(reason);

    const savedColor = localStorage.getItem("playerColor");
    if (savedColor) {
      this.socketManager.sendPlayerColor(savedColor);
    }
  }

  /** Used by ClientSocketManager after a successful reconnect (with retry timer). */
  private requestInitializationAfterReconnect(): void {
    this.pendingFullStateEvent = null;
    this.hasReceivedPlayerId = false;
    this.hasReceivedInitialState = false;
    this.gameState.playerId = 0;
    this.interpolation.reset();
    this.clearFullStateRequestTimer();
    this.connectionLifecycle = "awaitingIdentity";

    this.socketManager.requestPlayerId();
    this.requestFullState("transport reconnected");
  }

  private checkInitialization(): void {
    if (this.isInitialized()) {
      this.gameClient.start();
    }
  }
}
