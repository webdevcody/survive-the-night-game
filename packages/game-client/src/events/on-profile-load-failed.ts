import { ProfileLoadFailedEvent } from "../../../game-shared/src/events/server-sent/events/profile-load-failed-event";
import { ClientEventContext } from "./types";

/**
 * Website DB did not return player-experience after auth; do not enter the world with empty progress.
 */
export const onProfileLoadFailed = (context: ClientEventContext, event: ProfileLoadFailedEvent): void => {
  const message =
    event.getMessage() ||
    "Could not load your saved progress. Please try again in a moment.";
  console.warn(`Profile load failed from server: ${message}`);

  context.socketManager.disableReconnection();

  if (typeof window !== "undefined") {
    alert(message);
    window.location.href = "/play";
  }
};
