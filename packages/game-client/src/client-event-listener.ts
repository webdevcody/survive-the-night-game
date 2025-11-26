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
import { onLightningBolt } from "./events/on-lightning-bolt";
import { onYourId } from "./events/on-your-id";
import { onVersionMismatch } from "./events/on-version-mismatch";
import { onUserBanned } from "./events/on-user-banned";
import { ClientEventContext, InitializationContext } from "./events/types";

export class ClientEventListener {
  private socketManager: ClientSocketManager;
  private gameClient: GameClient;
  private gameState: GameState;
  private hasReceivedPlayerId = false;
  private hasReceivedInitialState = false;
  private interpolation: InterpolationManager = new InterpolationManager();
  private previousWaveState: WaveState | undefined = undefined;
  private lastFullStateRequestAt: number | null = null;
  private lastFullStateRequestReason: string | null = null;
  private fullStateRequestTimer: ReturnType<typeof setTimeout> | null = null;

  private isInitialized(): boolean {
    return this.hasReceivedPlayerId && this.hasReceivedInitialState;
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
      onPlayerDroppedItem(context, e)
    );
    this.socketManager.on(ServerSentEvents.PLAYER_PICKED_UP_ITEM, (e) =>
      onPlayerPickedUpItem(context, e)
    );
    this.socketManager.on(ServerSentEvents.PLAYER_PICKED_UP_RESOURCE, (e) =>
      onPlayerPickedUpResource(context, e)
    );

    this.socketManager.on(ServerSentEvents.GAME_OVER, (e) => onGameOver(context, e));
    this.socketManager.on(ServerSentEvents.GAME_STARTED, (e) =>
      onGameStarted(this.createInitializationContext(), e)
    );
    this.socketManager.on(ServerSentEvents.SERVER_UPDATING, (e) => onServerUpdating(context, e));
    this.socketManager.on(ServerSentEvents.PONG, (e) => onPong(context, e));

    this.socketManager.on(ServerSentEvents.CHAT_MESSAGE, (e) => onChatMessage(context, e));
    this.socketManager.on(ServerSentEvents.GAME_MESSAGE, (e) => onGameMessage(context, e));

    this.socketManager.on(ServerSentEvents.CAR_REPAIR, (e) => onCarRepair(context, e));
    this.socketManager.on(ServerSentEvents.WAVE_START, (e) => onWaveStart(context, e));
    this.socketManager.on(ServerSentEvents.CRAFT, (e) => onCraft(context, e));
    this.socketManager.on(ServerSentEvents.BUILD, (e) => onBuild(context, e));
    this.socketManager.on(ServerSentEvents.VERSION_MISMATCH, (e) => onVersionMismatch(context, e));
    this.socketManager.on(ServerSentEvents.USER_BANNED, (e) => onUserBanned(context, e));
    this.socketManager.on(ServerSentEvents.LIGHTNING_BOLT, (e) => onLightningBolt(context, e));

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
      requestFullState: this.requestFullState.bind(this),
      invalidateInitialState: this.invalidateInitialState.bind(this),
    };
  }

  private createInitializationContext(): InitializationContext {
    return {
      ...this.createContext(),
      interpolation: this.interpolation,
      previousWaveState: this.previousWaveState,
      hasReceivedPlayerId: this.hasReceivedPlayerId,
      hasReceivedInitialState: this.hasReceivedInitialState,
      setHasReceivedPlayerId: (value: boolean) => {
        this.hasReceivedPlayerId = value;
      },
      setHasReceivedInitialState: (value: boolean, reason?: string) => {
        const changed = this.hasReceivedInitialState !== value;
        this.hasReceivedInitialState = value;
        if (!changed) {
          return;
        }
        if (value) {
          const suffix = reason ? ` (${reason})` : "";
          console.log(`[ClientEventListener] Initial full state ready${suffix}`);
          this.clearFullStateRequestTimer("Initial full state applied");
        } else {
          this.invalidateInitialState(reason ?? "Initial state flag reset");
        }
      },
      setPreviousWaveState: (state: WaveState | undefined) => {
        this.previousWaveState = state;
      },
      checkInitialization: () => {
        this.checkInitialization();
      },
      resetAndRequestInitialization: (reason: string) => {
        this.resetAndRequestInitialization(reason);
      },
    };
  }

  private handleDisconnect(): void {
    this.invalidateInitialState("Socket disconnected");
    // Reset initialization flags so we wait for fresh data on reconnect
    this.hasReceivedPlayerId = false;

    // Handle side effects
    handleDisconnect(this.createContext());
  }

  private requestFullState(reason: string = "manual"): void {
    console.log(`[ClientEventListener] Requesting full state (${reason})`);
    this.lastFullStateRequestReason = reason;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.lastFullStateRequestAt = now;
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

      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed =
        this.lastFullStateRequestAt !== null ? Math.round(now - this.lastFullStateRequestAt) : null;
      const elapsedLabel = elapsed !== null ? ` (${elapsed}ms elapsed)` : "";
      console.warn(
        `[ClientEventListener] Still waiting for full state${elapsedLabel}. Retrying request...`
      );
      this.socketManager.sendRequestFullState();
      this.scheduleFullStateTimeout();
    }, 4000);
  }

  private clearFullStateRequestTimer(message?: string): void {
    if (this.fullStateRequestTimer) {
      clearTimeout(this.fullStateRequestTimer);
      this.fullStateRequestTimer = null;
    }
    if (message) {
      console.log(`[ClientEventListener] ${message}`);
    }
    this.lastFullStateRequestAt = null;
    this.lastFullStateRequestReason = null;
  }

  private invalidateInitialState(reason: string = "unspecified"): void {
    if (this.hasReceivedInitialState) {
      console.warn(`[ClientEventListener] Initial state invalidated: ${reason}`);
    } else {
      console.log(`[ClientEventListener] Waiting for initial state (${reason})`);
    }
    this.hasReceivedInitialState = false;
    this.interpolation.reset();
    this.clearFullStateRequestTimer();
  }

  /**
   * Resets initialization state and requests both player ID and full game state.
   * Used when a new game starts (players get new entity IDs) or on reconnection.
   */
  private resetAndRequestInitialization(reason: string): void {
    console.log(`[ClientEventListener] Resetting initialization: ${reason}`);

    // Reset both flags - we need fresh player ID and full state
    this.hasReceivedPlayerId = false;
    this.hasReceivedInitialState = false;
    this.interpolation.reset();
    this.clearFullStateRequestTimer();

    // Request both player ID and full state
    console.log(`[ClientEventListener] Requesting player ID (${reason})`);
    this.socketManager.requestPlayerId();
    this.requestFullState(reason);

    const savedColor = localStorage.getItem("playerColor");
    if (savedColor) {
      this.socketManager.sendPlayerColor(savedColor);
    }
  }

  private checkInitialization() {
    if (this.isInitialized()) {
      // All required data received, start the game
      this.gameClient.start();
    }
  }
}
