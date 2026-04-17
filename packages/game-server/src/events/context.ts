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
import { PlayerClassId } from "@shared/player/player-class";
import { SessionValidator } from "@/services/session-validator";
import { UserSessionCache } from "@/services/user-session-cache";
import type { PersistedPlayerProgress } from "@/services/player-progress-types";

export interface HandlerContext {
  players: Map<string, Player>;
  playerDisplayNames: Map<string, string>;
  playerColors: Map<string, PlayerColor>;
  playerClasses: Map<string, PlayerClassId>;
  gameServer: GameServer;
  bufferManager: BufferManager;
  chatCommandRegistry: CommandRegistry;
  profanityMatcher: RegExpMatcher;
  profanityCensor: TextCensor;
  sessionValidator: SessionValidator;
  userSessionCache: UserSessionCache;
  /** Shared disconnect path with de-duplication for forced and transport closes. */
  performManagedDisconnect?: (socket: ISocketAdapter) => Promise<void>;
  /** Stop distributed-session heartbeat tracking for this socket (before cache remove). */
  notifyDistributedSessionSocketClosing?: (socket: ISocketAdapter) => void;
  /** Remove gameplay idle tracking so periodic idle kicks ignore this socket during teardown. */
  clearGameplayIdleTracking?: (socket: ISocketAdapter) => void;
  getEntityManager(): IEntityManager;
  getMapManager(): MapManager;
  getGameManagers(): IGameManagers;
  broadcastEvent(event: GameEvent<any>): void;
  sendEventToSocket(socket: ISocketAdapter, event: GameEvent<any>): void;
  sanitizeText(text: string): string;
  createPlayerForSocket(socket: ISocketAdapter, initialProgress?: PersistedPlayerProgress): Player;
  broadcastPlayerJoined(player: Player): void;
}
