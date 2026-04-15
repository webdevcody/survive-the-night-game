import { PLAY_IDLE_DISMISS_MESSAGE_STORAGE_KEY } from "@shared/constants/play-session-storage";
import { SessionIdleTimeoutEvent } from "../../../game-shared/src/events/server-sent/events/session-idle-timeout-event";
import { ClientEventContext } from "./types";

/**
 * Gameplay idle timeout on the server (ping traffic alone does not count).
 */
export const onSessionIdleTimeout = (
  context: ClientEventContext,
  event: SessionIdleTimeoutEvent,
): void => {
  const message =
    event.getMessage() ||
    "You were disconnected after being inactive for too long. You can reconnect from the play page.";
  console.warn(`Session idle timeout: ${message}`);

  context.socketManager.disableReconnection();

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(PLAY_IDLE_DISMISS_MESSAGE_STORAGE_KEY, message);
    } catch {
      /* quota / private mode */
    }
    window.location.replace(`/play?error=idleTimeout`);
  }
};
