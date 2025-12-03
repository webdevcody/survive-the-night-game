/**
 * Get the game authentication token from the window global.
 * This token is set by the website's play page after fetching it from a server function.
 * The token is a signed, short-lived token that can be used for WebSocket authentication.
 *
 * @returns The game auth token if available, null otherwise
 */
export function getGameAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Token is set by the website's play page
  return (window as any).__gameAuthToken ?? null;
}
