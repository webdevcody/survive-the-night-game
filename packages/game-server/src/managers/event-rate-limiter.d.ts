/**
 * Event rate limiter - tracks event frequency per socket and bans abusers
 * Prevents DoS attacks via event flooding
 */
export declare class EventRateLimiter {
    private eventCounts;
    private bannedSockets;
    private readonly eventLimits;
    private readonly defaultLimit;
    private readonly exemptEvents;
    private readonly BAN_DURATION_MS;
    private strikes;
    private readonly STRIKES_BEFORE_BAN;
    /**
     * Check if an event should be allowed and record it
     * @param socketId The socket ID
     * @param eventType The event type being sent
     * @returns Object with allowed (boolean) and shouldBan (boolean)
     */
    checkEvent(socketId: string, eventType: string): {
        allowed: boolean;
        shouldBan: boolean;
        reason?: string;
    };
    /**
     * Check if a socket is currently banned
     */
    isBanned(socketId: string): boolean;
    /**
     * Get ban expiration time for a socket
     */
    getBanExpiration(socketId: string): number | null;
    /**
     * Manually ban a socket
     */
    banSocket(socketId: string, reason: string): void;
    /**
     * Remove a socket's tracking data (call on disconnect)
     */
    removeSocket(socketId: string): void;
    /**
     * Clean up old data (call periodically)
     */
    cleanup(): void;
}
