import { VersionMismatchEvent } from "../../../game-shared/src/events/server-sent/events/version-mismatch-event";
import { ClientEventContext } from "./types";

/**
 * Handle version mismatch event from server
 * Disables reconnection and refreshes the browser and redirects to home page
 */
export const onVersionMismatch = (context: ClientEventContext, event: VersionMismatchEvent): void => {
  console.warn(
    `Version mismatch detected. Server version: ${event.getServerVersion()}, Client version: ${
      event.getClientVersion() || "unknown"
    }`
  );

  // Disable reconnection to prevent infinite reconnect loop
  context.socketManager.disableReconnection();

  // Check if we're in a browser environment
  if (typeof window !== "undefined") {
    // Redirect to home page and refresh
    window.location.href = "/";
  }
};
