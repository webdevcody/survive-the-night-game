/**
 * Rate limiter and ban manager
 * Tracks connection attempts and bans users who connect too frequently
 */
export class RateLimiter {
  // Track connection attempts: displayName -> array of timestamps
  private connectionAttempts: Map<string, number[]> = new Map();

  // Track bans: displayName -> ban expiration timestamp
  private bans: Map<string, number> = new Map();

  // Configuration
  private readonly CONNECTION_WINDOW_MS = 60 * 1000; // 1 minute
  private readonly MAX_CONNECTIONS_PER_WINDOW = 10; // More than 1 connection in 1 minute triggers ban
  private readonly BAN_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Record a connection attempt and check if user should be banned
   * @param displayName The display name of the user attempting to connect
   * @returns true if user should be banned, false otherwise
   */
  public recordConnectionAttempt(displayName: string): boolean {
    const now = Date.now();
    const normalizedName = displayName.toLowerCase().trim();

    // Check if user is currently banned
    const banExpiration = this.bans.get(normalizedName);
    if (banExpiration && banExpiration > now) {
      const remainingMinutes = Math.ceil((banExpiration - now) / (60 * 1000));
      console.warn(`User ${displayName} is banned. Ban expires in ${remainingMinutes} minutes.`);
      return true;
    }

    // Remove expired ban if exists
    if (banExpiration && banExpiration <= now) {
      this.bans.delete(normalizedName);
    }

    // Get or create connection attempts array
    let attempts = this.connectionAttempts.get(normalizedName);
    if (!attempts) {
      attempts = [];
      this.connectionAttempts.set(normalizedName, attempts);
    }

    // Remove attempts outside the time window
    const windowStart = now - this.CONNECTION_WINDOW_MS;
    attempts = attempts.filter((timestamp) => timestamp > windowStart);
    this.connectionAttempts.set(normalizedName, attempts);

    // Record this connection attempt
    attempts.push(now);

    // Check if threshold exceeded
    if (attempts.length > this.MAX_CONNECTIONS_PER_WINDOW) {
      // Ban the user
      const banExpirationTime = now + this.BAN_DURATION_MS;
      this.bans.set(normalizedName, banExpirationTime);
      console.warn(
        `User ${displayName} exceeded connection limit (${attempts.length} connections in past minute). Banned for 1 hour.`
      );
      return true;
    }

    return false;
  }

  /**
   * Check if a user is currently banned
   * @param displayName The display name to check
   * @returns true if banned, false otherwise
   */
  public isBanned(displayName: string): boolean {
    const normalizedName = displayName.toLowerCase().trim();
    const banExpiration = this.bans.get(normalizedName);
    const now = Date.now();

    if (!banExpiration) {
      return false;
    }

    if (banExpiration <= now) {
      // Ban expired, remove it
      this.bans.delete(normalizedName);
      return false;
    }

    return true;
  }

  /**
   * Get ban expiration time for a user
   * @param displayName The display name to check
   * @returns Ban expiration timestamp in milliseconds, or null if not banned
   */
  public getBanExpiration(displayName: string): number | null {
    const normalizedName = displayName.toLowerCase().trim();
    const banExpiration = this.bans.get(normalizedName);
    const now = Date.now();

    if (!banExpiration || banExpiration <= now) {
      if (banExpiration && banExpiration <= now) {
        this.bans.delete(normalizedName);
      }
      return null;
    }

    return banExpiration;
  }

  /**
   * Clean up old connection attempts (call periodically to prevent memory leaks)
   */
  public cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.CONNECTION_WINDOW_MS;

    // Clean up old connection attempts
    for (const [displayName, attempts] of this.connectionAttempts.entries()) {
      const filtered = attempts.filter((timestamp) => timestamp > windowStart);
      if (filtered.length === 0) {
        this.connectionAttempts.delete(displayName);
      } else {
        this.connectionAttempts.set(displayName, filtered);
      }
    }

    // Clean up expired bans
    for (const [displayName, banExpiration] of this.bans.entries()) {
      if (banExpiration <= now) {
        this.bans.delete(displayName);
      }
    }
  }
}
