import { Player } from "@/entities/players/player";
import { GameServer } from "@/core/server";
import { CommandManager } from "@/managers/command-manager";
import { MapManager } from "@/world/map-manager";
import { IEntityManager, IGameManagers } from "@/managers/types";
import { DelayedServerSocket } from "@/util/delayed-socket";
import { CommandRegistry } from "@/commands";
import { BufferManager } from "@/broadcasting/buffer-manager";
import { DelayedServer } from "@/util/delayed-socket";
import { GameEvent } from "@shared/events/types";
import { RegExpMatcher, TextCensor } from "obscenity";
import { ISocketAdapter } from "@shared/network/socket-adapter";

export interface HandlerContext {
  players: Map<string, Player>;
  playerDisplayNames: Map<string, string>;
  gameServer: GameServer;
  bufferManager: BufferManager;
  delayedIo: DelayedServer;
  chatCommandRegistry: CommandRegistry;
  profanityMatcher: RegExpMatcher;
  profanityCensor: TextCensor;
  getEntityManager(): IEntityManager;
  getMapManager(): MapManager;
  getCommandManager(): CommandManager;
  getGameManagers(): IGameManagers;
  wrapSocket(socket: any): DelayedServerSocket;
  broadcastEvent(event: GameEvent<any>): void;
  sendEventToSocket(socket: ISocketAdapter, event: GameEvent<any>): void;
  sanitizeText(text: string): string;
  createPlayerForSocket(socket: any): Player;
  sendInitialDataToSocket(socket: any, player: Player): void;
  broadcastPlayerJoined(player: Player): void;
}
