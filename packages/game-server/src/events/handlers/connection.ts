import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import type { PersistedPlayerProgress } from "@/services/player-progress-types";
import { emptyProfessionProgress } from "@shared/util/professions";
import {
  afterHumanPlayerJoinedSession,
  emitInitializationForSocket,
  removeExistingPlayerEntityForSocket,
} from "@/session/player-session-lifecycle";

const defaultProgress = (): PersistedPlayerProgress => ({
  experience: 0,
  abilityAllocations: {},
  characterAllocations: {},
  professionProgress: emptyProfessionProgress(),
});

/**
 * Server pushes YOUR_ID + full state after the player row exists (authoritative init on connect).
 * Clients may still send REQUEST_* for reconnect / recovery.
 */
export function onConnection(
  context: HandlerContext,
  socket: ISocketAdapter,
  initialProgress: PersistedPlayerProgress = defaultProgress(),
): void {
  try {
    // Note: setupSocketListeners should be called before onConnection in ServerSocketManager

    removeExistingPlayerEntityForSocket(context, socket);

    const player = context.createPlayerForSocket(socket, initialProgress);
    context.broadcastPlayerJoined(player);

    afterHumanPlayerJoinedSession(context);
  } finally {
    emitInitializationForSocket(context, socket);
  }
}
