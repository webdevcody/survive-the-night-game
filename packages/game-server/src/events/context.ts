import { Player } from "@/entities/players/player";
import { GameServer } from "@/core/server";
import { MapManager } from "@/world/map-manager";
import { IEntityManager, IGameManagers } from "@/managers/types";
import { CommandRegistry } from "@/commands";
import { BufferManager } from "@/broadcasting/buffer-manager";
import { GameEvent } from "@shared/events/types";
import { RegExpMatcher, TextCensor } from "obscenity";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { PlayerColor } from "@shared/commands/commands";
import { SessionValidator } from "@/services/session-validator";
import { UserSessionCache } from "@/services/user-session-cache";

export interface HandlerContext {
  players: Map<string, Player>;
  playerDisplayNames: Map<string, string>;
  playerColors: Map<string, PlayerColor>;
  gameServer: GameServer;
  bufferManager: BufferManager;
  chatCommandRegistry: CommandRegistry;
  profanityMatcher: RegExpMatcher;
  profanityCensor: TextCensor;
  sessionValidator: SessionValidator;
  userSessionCache: UserSessionCache;
  getEntityManager(): IEntityManager;
  getMapManager(): MapManager;
  getGameManagers(): IGameManagers;
  broadcastEvent(event: GameEvent<any>): void;
  sendEventToSocket(socket: ISocketAdapter, event: GameEvent<any>): void;
  sanitizeText(text: string): string;
  createPlayerForSocket(socket: any): Player;
  broadcastPlayerJoined(player: Player): void;
}
