import { AuthRequiredEvent } from "../../../game-shared/src/events/server-sent/events/auth-required-event";
import { ClientEventContext } from "./types";

/**
 * Server rejected the connection because the game auth token was missing or invalid.
 * Disable reconnection and send the user to sign-in with return URL to /play.
 */
export const onAuthRequired = (context: ClientEventContext, event: AuthRequiredEvent): void => {
  const message =
    event.getMessage() ||
    "You must be signed in to play. Please sign in and try again.";
  console.warn(`Auth required from server: ${message}`);

  context.socketManager.disableReconnection();

  if (typeof window !== "undefined") {
    window.location.href = "/sign-in?redirect=/play";
  }
};
