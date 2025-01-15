import { ServerSentEvents, ClientSentEvents } from "@server/events/events";
import { GameOverEvent } from "@server/events/server-sent/game-over-event";
import { GameStateEvent } from "@server/events/server-sent/game-state-event";
import { GunEmptyEvent } from "@server/events/server-sent/gun-empty-event";
import { LootEvent } from "@server/events/server-sent/loot-event";
import { MapEvent } from "@server/events/server-sent/map-event";
import { PlayerPickedUpItemEvent } from "@server/events/server-sent/pickup-item-event";
import { PlayerAttackedEvent } from "@server/events/server-sent/player-attacked-event";
import { PlayerDeathEvent } from "@server/events/server-sent/player-death-event";
import { PlayerDroppedItemEvent } from "@server/events/server-sent/player-dropped-item-event";
import { PlayerHurtEvent } from "@server/events/server-sent/player-hurt-event";
import { YourIdEvent } from "@server/events/server-sent/your-id-event";
import { ZombieAttackedEvent } from "@server/events/server-sent/zombie-attacked-event";
import { ZombieDeathEvent } from "@server/events/server-sent/zombie-death-event";
import { ZombieHurtEvent } from "@server/events/server-sent/zombie-hurt-event";
import { AdminCommand } from "@shared/commands/commands";
import { Input } from "@shared/geom/input";
import { RecipeType } from "@shared/geom/recipes";
import { Socket, io } from "socket.io-client";

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
