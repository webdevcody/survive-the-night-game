import { UserBannedEvent } from "../../../game-shared/src/events/server-sent/events/user-banned-event";

/**
 * Handle user banned event from server
 * Shows an alert dialog and redirects to home page
 */
export const onUserBanned = (event: UserBannedEvent): void => {
  const remainingMinutes = event.getRemainingBanTimeMinutes();
  const reason = event.getReason() || "You have been banned.";
  
  const message = `${reason}\n\nBan expires in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`;

  // Check if we're in a browser environment
  if (typeof window !== "undefined") {
    // Show alert dialog
    alert(message);
    
    // Redirect to home page after alert is closed
    window.location.href = "/";
  }
};

