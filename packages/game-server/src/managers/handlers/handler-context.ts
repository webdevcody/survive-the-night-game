import { Player } from "@/entities/player";
import { GameServer } from "@/server";
import { CommandManager } from "@/managers/command-manager";
import { MapManager } from "@/managers/map-manager";
import { IEntityManager, IGameManagers } from "@/managers/types";
import { CommandRegistry } from "@/commands";
import { BufferManager } from "../buffer-manager";
import { GameEvent } from "@shared/events/types";
import { RegExpMatcher, TextCensor } from "obscenity";

export interface HandlerContext {
  players: Map<string, Player>;
  playerDisplayNames: Map<string, string>;
  gameServer: GameServer;
  bufferManager: BufferManager;
  chatCommandRegistry: CommandRegistry;
  profanityMatcher: RegExpMatcher;
  profanityCensor: TextCensor;
  getEntityManager(): IEntityManager;
  getMapManager(): MapManager;
  getCommandManager(): CommandManager;
  getGameManagers(): IGameManagers;
  broadcastEvent(event: GameEvent<any>): void;
  sanitizeText(text: string): string;
  createPlayerForSocket(socket: any): Player;
  sendInitialDataToSocket(socket: any, player: Player): void;
  broadcastPlayerJoined(player: Player): void;
}
