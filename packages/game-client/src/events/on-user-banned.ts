import { UserBannedEvent } from "../../../game-shared/src/events/server-sent/events/user-banned-event";
import { ClientEventContext } from "./types";

/**
 * Handle user banned event from server
 * Disables reconnection, shows an alert dialog and redirects to home page
 */
export const onUserBanned = (context: ClientEventContext, event: UserBannedEvent): void => {
  const remainingMinutes = event.getRemainingBanTimeMinutes();
  const reason = event.getReason() || "You have been banned.";
  
  const message = `${reason}\n\nBan expires in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`;

  // Disable reconnection to prevent infinite reconnect loop
  context.socketManager.disableReconnection();

  // Check if we're in a browser environment
  if (typeof window !== "undefined") {
    // Show alert dialog
    alert(message);
    
    // Redirect to home page after alert is closed
    window.location.href = "/";
  }
};

