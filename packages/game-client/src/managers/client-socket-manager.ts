import { io, Socket } from "socket.io-client";
import { PlayerHurtEvent } from "@server/shared/events/server-sent/player-hurt-event";
import { PlayerAttackedEvent } from "@server/shared/events/server-sent/player-attacked-event";
import { ZombieDeathEvent } from "@server/shared/events/server-sent/zombie-death-event";
import { ZombieHurtEvent } from "@server/shared/events/server-sent/zombie-hurt-event";
import { PlayerDroppedItemEvent } from "@server/shared/events/server-sent/player-dropped-item-event";
import { PlayerPickedUpItemEvent } from "@server/shared/events/server-sent/pickup-item-event";
import { GameOverEvent } from "@server/shared/events/server-sent/game-over-event";
import { ZombieAttackedEvent } from "@server/shared/events/server-sent/zombie-attacked-event";
import { LootEvent } from "@server/shared/events/server-sent/loot-event";
import { GunEmptyEvent } from "@server/shared/events/server-sent/gun-empty-event";
import { AdminCommand } from "@shared/commands/commands";
import { ServerSentEvents, ClientSentEvents } from "@server/shared/events/events";
import {
  GameStateEvent,
  PlayerDeathEvent,
  MapEvent,
  YourIdEvent,
} from "@server/shared/events/server-sent";
import { Input } from "@server/shared/input";
import { RecipeType } from "@server/shared/recipes";

export type EntityDto = { id: string } & any;

const SERVER_EVENT_MAP = {
  [ServerSentEvents.GAME_STATE_UPDATE]: GameStateEvent,
  [ServerSentEvents.PLAYER_DEATH]: PlayerDeathEvent,
  [ServerSentEvents.MAP]: MapEvent,
  [ServerSentEvents.YOUR_ID]: YourIdEvent,
  [ServerSentEvents.PLAYER_HURT]: PlayerHurtEvent,
  [ServerSentEvents.PLAYER_ATTACKED]: PlayerAttackedEvent,
  [ServerSentEvents.ZOMBIE_DEATH]: ZombieDeathEvent,
  [ServerSentEvents.ZOMBIE_HURT]: ZombieHurtEvent,
  [ServerSentEvents.PLAYER_DROPPED_ITEM]: PlayerDroppedItemEvent,
  [ServerSentEvents.PLAYER_PICKED_UP_ITEM]: PlayerPickedUpItemEvent,
  [ServerSentEvents.GAME_OVER]: GameOverEvent,
  [ServerSentEvents.GUN_EMPTY]: GunEmptyEvent,
  [ServerSentEvents.ZOMBIE_ATTACKED]: ZombieAttackedEvent,
  [ServerSentEvents.LOOT]: LootEvent,
} as const;

export class ClientSocketManager {
  private socket: Socket;

  public on<K extends keyof typeof SERVER_EVENT_MAP>(eventType: K, handler: (event: any) => void) {
    this.socket.on(eventType, (serializedEvent) => {
      const event = new SERVER_EVENT_MAP[eventType](serializedEvent);
      handler(event);
    });
  }

  constructor(serverUrl: string) {
    this.socket = io(serverUrl);

    this.socket.on("connect", () => {
      // handlers.onConnect(this.getId()!);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from game server");
    });
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
}
