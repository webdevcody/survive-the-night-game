/**
 * Rate limiter and ban manager
 * Tracks connection attempts and bans users who connect too frequently
 */
export declare class RateLimiter {
    private connectionAttempts;
    private bans;
    private readonly CONNECTION_WINDOW_MS;
    private readonly MAX_CONNECTIONS_PER_WINDOW;
    private readonly BAN_DURATION_MS;
    /**
     * Record a connection attempt and check if user should be banned
     * @param displayName The display name of the user attempting to connect
     * @returns true if user should be banned, false otherwise
     */
    recordConnectionAttempt(displayName: string): boolean;
    /**
     * Check if a user is currently banned
     * @param displayName The display name to check
     * @returns true if banned, false otherwise
     */
    isBanned(displayName: string): boolean;
    /**
     * Get ban expiration time for a user
     * @param displayName The display name to check
     * @returns Ban expiration timestamp in milliseconds, or null if not banned
     */
    getBanExpiration(displayName: string): number | null;
    /**
     * Clean up old connection attempts (call periodically to prevent memory leaks)
     */
    cleanup(): void;
}
