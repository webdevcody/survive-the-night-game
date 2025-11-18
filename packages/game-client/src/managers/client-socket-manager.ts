import { ServerSentEvents, ClientSentEvents } from "@shared/events/events";
import { GameOverEvent } from "../../../game-shared/src/events/server-sent/events/game-over-event";
import { GameStateEvent } from "../../../game-shared/src/events/server-sent/events/game-state-event";
import { GameStartedEvent } from "../../../game-shared/src/events/server-sent/events/game-started-event";
import { GunEmptyEvent } from "../../../game-shared/src/events/server-sent/events/gun-empty-event";
import { GunFiredEvent } from "../../../game-shared/src/events/server-sent/events/gun-fired-event";
import { LootEvent } from "../../../game-shared/src/events/server-sent/events/loot-event";
import { MapEvent } from "../../../game-shared/src/events/server-sent/events/map-event";
import { PlayerPickedUpItemEvent } from "../../../game-shared/src/events/server-sent/events/pickup-item-event";
import { PlayerPickedUpResourceEvent } from "../../../game-shared/src/events/server-sent/events/pickup-resource-event";
import { PlayerAttackedEvent } from "../../../game-shared/src/events/server-sent/events/player-attacked-event";
import { PlayerDeathEvent } from "../../../game-shared/src/events/server-sent/events/player-death-event";
import { PlayerDroppedItemEvent } from "../../../game-shared/src/events/server-sent/events/player-dropped-item-event";
import { PlayerHurtEvent } from "../../../game-shared/src/events/server-sent/events/player-hurt-event";
import { PlayerJoinedEvent } from "../../../game-shared/src/events/server-sent/events/player-joined-event";
import { YourIdEvent } from "../../../game-shared/src/events/server-sent/events/your-id-event";
import { ZombieAttackedEvent } from "../../../game-shared/src/events/server-sent/events/zombie-attacked-event";
import { ZombieDeathEvent } from "../../../game-shared/src/events/server-sent/events/zombie-death-event";
import { ZombieHurtEvent } from "../../../game-shared/src/events/server-sent/events/zombie-hurt-event";
import { PongEvent } from "../../../game-shared/src/events/server-sent/events/pong-event";
import { AdminCommand } from "@shared/commands/commands";
import { Input } from "../../../game-shared/src/util/input";
import { RecipeType } from "../../../game-shared/src/util/recipes";
import { ServerUpdatingEvent } from "../../../game-shared/src/events/server-sent/events/server-updating-event";
import { ChatMessageEvent } from "../../../game-shared/src/events/server-sent/events/chat-message-event";
import { GameMessageEvent } from "../../../game-shared/src/events/server-sent/events/game-message-event";
import { PlayerLeftEvent } from "../../../game-shared/src/events/server-sent/events/player-left-event";
import { ExplosionEvent } from "../../../game-shared/src/events/server-sent/events/explosion-event";
import { DelayedSocket } from "../util/delayed-socket";
import { SIMULATION_CONFIG } from "@/config/client-prediction";
import { CoinPickupEvent } from "../../../game-shared/src/events/server-sent/events/coin-pickup-event";
import { CarRepairEvent } from "../../../game-shared/src/events/server-sent/events/car-repair-event";
import { WaveStartEvent } from "../../../game-shared/src/events/server-sent/events/wave-start-event";
import { CraftEvent } from "../../../game-shared/src/events/server-sent/events/craft-event";
import { BuildEvent } from "../../../game-shared/src/events/server-sent/events/build-event";
import { BossStepEvent } from "../../../game-shared/src/events/server-sent/events/boss-step-event";
import { BossSummonEvent } from "../../../game-shared/src/events/server-sent/events/boss-summon-event";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { IClientAdapter } from "@shared/network/client-adapter";
import { createClientAdapter } from "@/network/adapter-factory";
import { deserializeServerEvent } from "@shared/events/server-sent/server-event-serialization";

export type EntityDto = { id: string } & any;

const SERVER_EVENT_MAP = {
  [ServerSentEvents.GAME_STATE_UPDATE]: GameStateEvent,
  [ServerSentEvents.PLAYER_DEATH]: PlayerDeathEvent,
  [ServerSentEvents.MAP]: MapEvent,
  [ServerSentEvents.YOUR_ID]: YourIdEvent,
  [ServerSentEvents.PLAYER_HURT]: PlayerHurtEvent,
  [ServerSentEvents.PLAYER_ATTACKED]: PlayerAttackedEvent,
  [ServerSentEvents.PLAYER_JOINED]: PlayerJoinedEvent,
  [ServerSentEvents.ZOMBIE_DEATH]: ZombieDeathEvent,
  [ServerSentEvents.ZOMBIE_HURT]: ZombieHurtEvent,
  [ServerSentEvents.PLAYER_DROPPED_ITEM]: PlayerDroppedItemEvent,
  [ServerSentEvents.PLAYER_PICKED_UP_ITEM]: PlayerPickedUpItemEvent,
  [ServerSentEvents.PLAYER_PICKED_UP_RESOURCE]: PlayerPickedUpResourceEvent,
  [ServerSentEvents.GAME_OVER]: GameOverEvent,
  [ServerSentEvents.GUN_EMPTY]: GunEmptyEvent,
  [ServerSentEvents.GUN_FIRED]: GunFiredEvent,
  [ServerSentEvents.ZOMBIE_ATTACKED]: ZombieAttackedEvent,
  [ServerSentEvents.LOOT]: LootEvent,
  [ServerSentEvents.GAME_STARTED]: GameStartedEvent,
  [ServerSentEvents.COIN_PICKUP]: CoinPickupEvent,
  [ServerSentEvents.PLAYER_LEFT]: PlayerLeftEvent,
  [ServerSentEvents.SERVER_UPDATING]: ServerUpdatingEvent,
  [ServerSentEvents.PONG]: PongEvent,
  [ServerSentEvents.CHAT_MESSAGE]: ChatMessageEvent,
  [ServerSentEvents.GAME_MESSAGE]: GameMessageEvent,
  [ServerSentEvents.EXPLOSION]: ExplosionEvent,
  [ServerSentEvents.CAR_REPAIR]: CarRepairEvent,
  [ServerSentEvents.WAVE_START]: WaveStartEvent,
  [ServerSentEvents.CRAFT]: CraftEvent,
  [ServerSentEvents.BUILD]: BuildEvent,
  [ServerSentEvents.BOSS_STEP]: BossStepEvent,
  [ServerSentEvents.BOSS_SUMMON]: BossSummonEvent,
} as const;

export class ClientSocketManager {
  private socket!: DelayedSocket;
  private rawSocket!: ISocketAdapter;
  private clientAdapter!: IClientAdapter;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private onPingUpdate?: (ping: number) => void;
  private isDisconnected: boolean = false;
  private serverUrl: string;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = Infinity; // Keep trying indefinitely
  private readonly RECONNECT_DELAY_MS = 1000; // Start with 1 second delay
  private readonly MAX_CONNECTION_ATTEMPTS = 10;
  private readonly CONNECTION_TIMEOUT_MS = 10000; // 10 seconds timeout per attempt
  private eventHandlers: Map<string, Array<(event: any) => void>> = new Map();
  private socketDisconnectHandlers: Array<() => void> = [];
  private connectionPromiseResolve?: () => void;
  private connectionPromiseReject?: (error: Error) => void;
  private connectionTimeout?: ReturnType<typeof setTimeout>;
  private connectionResolved: boolean = false;
  private connectHandler?: () => void;
  private errorHandler?: (error: any) => void;
  private PING_INTERVAL_MS = 500;

  public on<K extends keyof typeof SERVER_EVENT_MAP>(eventType: K, handler: (event: any) => void) {
    const eventKey = eventType as string;
    if (!this.eventHandlers.has(eventKey)) {
      this.eventHandlers.set(eventKey, []);
    }
    this.eventHandlers.get(eventKey)!.push(handler);
    this.attachHandler(eventKey, handler);
  }

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const displayName = localStorage.getItem("displayName");

      if (!displayName) {
        reject(new Error("No display name found"));
        return;
      }

      this.connectionPromiseResolve = resolve;
      this.connectionPromiseReject = reject;
      this.connectionResolved = false;

      this.attemptConnection(0);
    });
  }

  private attemptConnection(attemptNumber: number): void {
    if (attemptNumber >= this.MAX_CONNECTION_ATTEMPTS) {
      const error = new Error(`Failed to connect after ${this.MAX_CONNECTION_ATTEMPTS} attempts`);
      console.error(error.message);
      if (this.connectionPromiseReject) {
        this.connectionPromiseReject(error);
      }
      return;
    }

    if (attemptNumber > 0) {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
      const delay = Math.min(this.RECONNECT_DELAY_MS * Math.pow(2, attemptNumber - 1), 10000);
      console.log(
        `Retrying connection in ${delay}ms (attempt ${attemptNumber + 1}/${
          this.MAX_CONNECTION_ATTEMPTS
        })...`
      );
      setTimeout(() => {
        this.performConnection(attemptNumber);
      }, delay);
    } else {
      this.performConnection(attemptNumber);
    }
  }

  private performConnection(attemptNumber: number): void {
    const displayName = localStorage.getItem("displayName");

    if (!displayName) {
      if (this.connectionPromiseReject) {
        this.connectionPromiseReject(new Error("No display name found"));
      }
      return;
    }

    console.log(
      `Connecting to game server (attempt ${attemptNumber + 1}/${this.MAX_CONNECTION_ATTEMPTS})`,
      this.serverUrl
    );

    // Clean up any existing connection
    this.cleanupConnection();

    // Create client adapter based on configuration and connect
    this.clientAdapter = createClientAdapter();
    this.rawSocket = this.clientAdapter.connect(`${this.serverUrl}?displayName=${displayName}`, {
      // Ensure we create a new connection each time
      forceNew: true,
    });

    // Wrap the socket with DelayedSocket to handle latency simulation
    this.socket = new DelayedSocket(this.rawSocket, SIMULATION_CONFIG.simulatedLatencyMs);
    this.registerStoredHandlers();

    // Set up connection timeout
    this.connectionTimeout = setTimeout(() => {
      console.log(
        `Connection timeout after ${this.CONNECTION_TIMEOUT_MS}ms (attempt ${attemptNumber + 1})`
      );
      this.cleanupConnection();
      this.attemptConnection(attemptNumber + 1);
    }, this.CONNECTION_TIMEOUT_MS);

    // Set up connection success handler
    this.connectHandler = () => {
      if (this.connectionResolved) {
        return; // Already resolved, ignore duplicate calls
      }

      console.log("Connected to game server", this.rawSocket.id);
      this.isDisconnected = false;
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection

      // Clear timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = undefined;
      }

      // Mark as resolved and resolve the promise
      this.connectionResolved = true;
      if (this.connectionPromiseResolve) {
        this.connectionPromiseResolve();
      }
    };

    // Set up connection error handler
    this.errorHandler = (error: any) => {
      if (this.connectionResolved) {
        return; // Already resolved, ignore errors
      }

      console.error("Connection error:", error);
      this.cleanupConnection();
      this.attemptConnection(attemptNumber + 1);
    };

    this.rawSocket.on("connect", this.connectHandler);
    this.rawSocket.on("error", this.errorHandler);

    // Set up disconnect handler (for after successful connection)
    this.rawSocket.on("disconnect", () => {
      console.log("Disconnected from game server");
      this.isDisconnected = true;
      this.stopPingMeasurement();
      this.socketDisconnectHandlers.forEach((handler) => {
        try {
          handler();
        } catch (error) {
          console.error("Error in socket disconnect handler", error);
        }
      });
      this.attemptReconnect();
    });
  }

  private cleanupConnection(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = undefined;
    }

    // Clear handler references
    this.connectHandler = undefined;
    this.errorHandler = undefined;

    if (this.rawSocket) {
      try {
        this.rawSocket.disconnect();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  }

  public requestFullState(): void {
    this.socket.emit(ClientSentEvents.REQUEST_FULL_STATE);
  }

  private attemptReconnect(): void {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnect attempts reached, giving up");
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
    const delay = Math.min(this.RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimeout = setTimeout(() => {
      console.log("Reconnecting to game server...");
      this.connect().catch((error) => {
        console.error("Reconnection attempt failed:", error);
        // Continue attempting reconnection
        this.attemptReconnect();
      });
    }, delay);
  }

  private attachHandler(eventType: string, handler: (event: any) => void): void {
    if (!this.socket) {
      return;
    }

    this.socket.on(eventType as any, (decodedEvent: any) => {
      const run = () => {
        const Ctor = (SERVER_EVENT_MAP as any)[eventType];
        let eventInstance: any;

        if (
          eventType === ServerSentEvents.GAME_STATE_UPDATE &&
          decodedEvent instanceof ArrayBuffer
        ) {
          eventInstance = Ctor.deserializeFromBuffer(decodedEvent);
        } else if (decodedEvent instanceof ArrayBuffer) {
          const deserialized = deserializeServerEvent(eventType as string, decodedEvent);
          if (deserialized !== null) {
            eventInstance = new Ctor(deserialized[0]);
          } else {
            eventInstance = new Ctor(decodedEvent);
          }
        } else {
          eventInstance = new Ctor(decodedEvent);
        }

        handler(eventInstance);
      };

      if (SIMULATION_CONFIG.simulatedLatencyMs > 0) {
        setTimeout(run, SIMULATION_CONFIG.simulatedLatencyMs);
      } else {
        run();
      }
    });
  }

  private registerStoredHandlers(): void {
    this.eventHandlers.forEach((handlers, eventType) => {
      handlers.forEach((handler) => this.attachHandler(eventType, handler));
    });
  }

  public onSocketDisconnect(handler: () => void): void {
    if (!this.socketDisconnectHandlers.includes(handler)) {
      this.socketDisconnectHandlers.push(handler);
    }
  }

  public startPingMeasurement(): void {
    if (this.pingInterval) return;

    // Send initial ping
    this.sendPing();

    // Set up interval for regular pings
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.PING_INTERVAL_MS);
  }

  private stopPingMeasurement(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private sendPing(): void {
    // Date.now() returns Unix timestamp in milliseconds (UTC, timezone-independent)
    this.socket.emit(ClientSentEvents.PING, Date.now());
  }

  public sendPingUpdate(latency: number): void {
    this.socket.emit(ClientSentEvents.PING_UPDATE, latency);
  }

  public sendCraftRequest(recipe: RecipeType) {
    this.socket.emit(ClientSentEvents.CRAFT_REQUEST, recipe);
  }

  public sendStartCrafting() {
    this.socket.emit(ClientSentEvents.START_CRAFTING);
  }

  public sendStopCrafting() {
    this.socket.emit(ClientSentEvents.STOP_CRAFTING);
  }

  public sendInput(input: Input) {
    this.socket.emit(ClientSentEvents.PLAYER_INPUT, input);
  }

  public sendAdminCommand(command: AdminCommand) {
    this.socket.emit(ClientSentEvents.ADMIN_COMMAND, command);
  }

  public sendRequestFullState() {
    this.socket.emit(ClientSentEvents.REQUEST_FULL_STATE);
  }

  public getIsDisconnected(): boolean {
    return this.isDisconnected;
  }

  public sendMerchantBuy(merchantId: string, itemIndex: number) {
    this.socket.emit(ClientSentEvents.MERCHANT_BUY, { merchantId, itemIndex });
  }

  public sendChatMessage(message: string) {
    this.socket.emit(ClientSentEvents.SEND_CHAT, { message });
  }

  public requestRespawn() {
    this.socket.emit(ClientSentEvents.PLAYER_RESPAWN_REQUEST);
  }

  public sendTeleportToBase() {
    this.socket.emit(ClientSentEvents.TELEPORT_TO_BASE);
  }

  public getSocket(): ISocketAdapter {
    return this.rawSocket;
  }

  /**
   * Disconnect from the game server and clean up resources
   */
  public disconnect(): void {
    if (this.isDisconnected) {
      return; // Already disconnected
    }

    // Clear reconnect timeout if we're manually disconnecting
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopPingMeasurement();

    if (this.rawSocket) {
      console.log("Disconnecting from game server");
      this.rawSocket.disconnect();
      this.isDisconnected = true;
    }
  }
}
