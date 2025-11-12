import { ServerSentEvents, ClientSentEvents } from "@shared/events/events";
import { GameOverEvent } from "@shared/events/server-sent/game-over-event";
import { GameStateEvent } from "@shared/events/server-sent/game-state-event";
import { GameStartedEvent } from "@shared/events/server-sent/game-started-event";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { LootEvent } from "@shared/events/server-sent/loot-event";
import { MapEvent } from "@shared/events/server-sent/map-event";
import { PlayerPickedUpItemEvent } from "@shared/events/server-sent/pickup-item-event";
import { PlayerPickedUpResourceEvent } from "@shared/events/server-sent/pickup-resource-event";
import { PlayerAttackedEvent } from "@shared/events/server-sent/player-attacked-event";
import { PlayerDeathEvent } from "@shared/events/server-sent/player-death-event";
import { PlayerDroppedItemEvent } from "@shared/events/server-sent/player-dropped-item-event";
import { PlayerHurtEvent } from "@shared/events/server-sent/player-hurt-event";
import { PlayerJoinedEvent } from "@shared/events/server-sent/player-joined-event";
import { YourIdEvent } from "@shared/events/server-sent/your-id-event";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import { ZombieHurtEvent } from "@shared/events/server-sent/zombie-hurt-event";
import { PongEvent } from "@shared/events/server-sent/pong-event";
import { AdminCommand } from "@shared/commands/commands";
import { Input } from "../../../game-shared/src/util/input";
import { RecipeType } from "../../../game-shared/src/util/recipes";
import { Socket, io } from "socket.io-client";
import { ServerUpdatingEvent } from "@shared/events/server-sent/server-updating-event";
import { ChatMessageEvent } from "@shared/events/server-sent/chat-message-event";
import { GameMessageEvent } from "@shared/events/server-sent/game-message-event";
import { PlayerLeftEvent } from "@shared/events/server-sent/player-left-event";
import { ExplosionEvent } from "@shared/events/server-sent/explosion-event";
import { DelayedSocket } from "../util/delayed-socket";
import { SIMULATION_CONFIG } from "@/config/client-prediction";
import { CoinPickupEvent } from "@shared/events/server-sent/coin-pickup-event";

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
} as const;

export class ClientSocketManager {
  private socket: DelayedSocket;
  private rawSocket: Socket;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private onPingUpdate?: (ping: number) => void;
  private isDisconnected: boolean = false;

  public on<K extends keyof typeof SERVER_EVENT_MAP>(eventType: K, handler: (event: any) => void) {
    this.rawSocket.on(eventType as any, (serializedEvent: any) => {
      const run = () => {
        const Ctor = (SERVER_EVENT_MAP as any)[eventType];
        const event = new Ctor(serializedEvent);
        handler(event);
      };
      if (SIMULATION_CONFIG.simulatedLatencyMs > 0) {
        setTimeout(run, SIMULATION_CONFIG.simulatedLatencyMs);
      } else {
        run();
      }
    });
  }

  constructor(serverUrl: string) {
    const displayName = localStorage.getItem("displayName");

    if (!displayName) {
      throw new Error("No display name found");
    }

    console.log("Connecting to game server", serverUrl);
    this.rawSocket = io(`${serverUrl}?displayName=${displayName}`, {
      // Ensure we create a new connection each time
      forceNew: true,
    });

    // Wrap the socket with DelayedSocket to handle latency simulation
    this.socket = new DelayedSocket(this.rawSocket, SIMULATION_CONFIG.simulatedLatencyMs);

    this.rawSocket.on("connect", () => {
      console.log("Connected to game server", this.rawSocket.id);
      this.isDisconnected = false;
      this.socket.emit(ClientSentEvents.REQUEST_FULL_STATE);
      this.startPingMeasurement();
    });

    this.rawSocket.on("disconnect", () => {
      console.log("Disconnected from game server");
      this.isDisconnected = true;
      this.stopPingMeasurement();
    });

    // Set up pong handler
    this.rawSocket.on(ServerSentEvents.PONG, (serializedEvent) => {
      const event = new PongEvent(serializedEvent.timestamp);
      // Both Date.now() and timestamp are Unix timestamps (milliseconds since epoch, UTC)
      // This calculation is timezone-independent
      const latency = Date.now() - event.getData().timestamp;
      if (this.onPingUpdate) {
        this.onPingUpdate(latency);
      }
      // Send calculated latency to server so it can update the player's ping
      // This ensures accurate ping calculation without clock skew issues
      this.socket.emit(ClientSentEvents.PING_UPDATE, latency);
    });
  }

  private startPingMeasurement(): void {
    if (this.pingInterval) return;

    // Send initial ping
    this.sendPing();

    // Set up interval for regular pings
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 5000);
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

  public onPing(callback: (ping: number) => void): void {
    this.onPingUpdate = callback;
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

  public getSocket(): Socket {
    return this.rawSocket;
  }

  /**
   * Disconnect from the game server and clean up resources
   */
  public disconnect(): void {
    if (this.isDisconnected) {
      return; // Already disconnected
    }

    this.stopPingMeasurement();

    if (this.rawSocket) {
      console.log("Disconnecting from game server");
      this.rawSocket.disconnect();
      this.isDisconnected = true;
    }
  }
}
