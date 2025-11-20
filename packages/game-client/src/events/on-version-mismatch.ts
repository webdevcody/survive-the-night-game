import { VersionMismatchEvent } from "../../../game-shared/src/events/server-sent/events/version-mismatch-event";

/**
 * Handle version mismatch event from server
 * Refreshes the browser and redirects to home page
 */
export const onVersionMismatch = (event: VersionMismatchEvent): void => {
  console.warn(
    `Version mismatch detected. Server version: ${event.getServerVersion()}, Client version: ${
      event.getClientVersion() || "unknown"
    }`
  );

  // Check if we're in a browser environment
  if (typeof window !== "undefined") {
    // Redirect to home page and refresh
    window.location.href = "/";
  }
};
