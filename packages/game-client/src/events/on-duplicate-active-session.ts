import { DuplicateActiveSessionEvent } from "../../../game-shared/src/events/server-sent/events/duplicate-active-session-event";
import { ClientEventContext } from "./types";

/**
 * Account already has an active game session (another tab or server). Fatal: no reconnect loop.
 */
export const onDuplicateActiveSession = (
  context: ClientEventContext,
  event: DuplicateActiveSessionEvent,
): void => {
  const message =
    event.getMessage() ||
    "This account is already in an active game session. Close the other session and try again.";
  console.warn(`Duplicate active session: ${message}`);

  context.socketManager.disableReconnection();

  if (typeof window !== "undefined") {
    const params = new URLSearchParams();
    params.set("error", "duplicateSession");
    window.location.replace(`/play?${params.toString()}`);
  }
};
