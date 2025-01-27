import { ServerSentEvents, ClientSentEvents } from "@shared/events/events";
import { GameOverEvent } from "@shared/events/server-sent/game-over-event";
import { GameStateEvent } from "@shared/events/server-sent/game-state-event";
import { GameStartedEvent } from "@shared/events/server-sent/game-started-event";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import { LootEvent } from "@shared/events/server-sent/loot-event";
import { MapEvent } from "@shared/events/server-sent/map-event";
import { PlayerPickedUpItemEvent } from "@shared/events/server-sent/pickup-item-event";
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
import { PlayerLeftEvent } from "@shared/events/server-sent/player-left-event";

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
  [ServerSentEvents.GAME_OVER]: GameOverEvent,
  [ServerSentEvents.GUN_EMPTY]: GunEmptyEvent,
  [ServerSentEvents.ZOMBIE_ATTACKED]: ZombieAttackedEvent,
  [ServerSentEvents.LOOT]: LootEvent,
  [ServerSentEvents.GAME_STARTED]: GameStartedEvent,
  [ServerSentEvents.PLAYER_LEFT]: PlayerLeftEvent,
  [ServerSentEvents.SERVER_UPDATING]: ServerUpdatingEvent,
  [ServerSentEvents.PONG]: PongEvent,
  [ServerSentEvents.CHAT_MESSAGE]: ChatMessageEvent,
} as const;

export class ClientSocketManager {
  private socket: Socket;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private onPingUpdate?: (ping: number) => void;

  public on<K extends keyof typeof SERVER_EVENT_MAP>(eventType: K, handler: (event: any) => void) {
    this.socket.on(eventType, (serializedEvent) => {
      const event = new SERVER_EVENT_MAP[eventType](serializedEvent);
      handler(event);
    });
  }

  constructor(serverUrl: string) {
    console.log("Connecting to game server", serverUrl);
    this.socket = io(serverUrl);

    this.socket.on("connect", () => {
      console.log("Connected to game server", this.socket.id);
      this.socket.emit(ClientSentEvents.REQUEST_FULL_STATE);
      this.startPingMeasurement();
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from game server");
      this.stopPingMeasurement();
    });

    // Set up pong handler
    this.socket.on(ServerSentEvents.PONG, (serializedEvent) => {
      const event = new PongEvent(serializedEvent.timestamp);
      const latency = Date.now() - event.getData().timestamp;
      if (this.onPingUpdate) {
        this.onPingUpdate(latency);
      }
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

  public sendChatMessage(message: string) {
    this.socket.emit(ClientSentEvents.SEND_CHAT, { message });
  }
}
