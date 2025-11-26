/**
 * Event rate limiter - tracks event frequency per socket and bans abusers
 * Prevents DoS attacks via event flooding
 */
export class EventRateLimiter {
  // Track event counts per socket: socketId -> eventType -> timestamps[]
  private eventCounts: Map<string, Map<string, number[]>> = new Map();

  // Track banned sockets: socketId -> ban expiration timestamp
  private bannedSockets: Map<string, number> = new Map();

  // Configuration for different event types
  // Note: Client sends PLAYER_INPUT every ~20ms (50/sec), so we need generous limits
  private readonly eventLimits: Record<string, { maxEvents: number; windowMs: number }> = {
    // High frequency events - no rate limiting for player input (it's the core game loop)
    // Only rate limit events that could be abused
    PING: { maxEvents: 30, windowMs: 1000 },
    PING_UPDATE: { maxEvents: 30, windowMs: 1000 },

    // Medium frequency events
    SEND_CHAT: { maxEvents: 10, windowMs: 1000 }, // 10 messages per second
    INTERACT: { maxEvents: 30, windowMs: 1000 },
    SELECT_INVENTORY_SLOT: { maxEvents: 30, windowMs: 1000 },

    // Low frequency events (actions)
    CRAFT_REQUEST: { maxEvents: 20, windowMs: 1000 },
    START_CRAFTING: { maxEvents: 20, windowMs: 1000 },
    STOP_CRAFTING: { maxEvents: 20, windowMs: 1000 },
    PLACE_STRUCTURE: { maxEvents: 20, windowMs: 1000 },
    DROP_ITEM: { maxEvents: 20, windowMs: 1000 },
    CONSUME_ITEM: { maxEvents: 20, windowMs: 1000 },
    SWAP_INVENTORY_ITEMS: { maxEvents: 20, windowMs: 1000 },
    MERCHANT_BUY: { maxEvents: 20, windowMs: 1000 },
    MERCHANT_SELL: { maxEvents: 20, windowMs: 1000 },
    TELEPORT_TO_BASE: { maxEvents: 5, windowMs: 1000 },
    PLAYER_RESPAWN_REQUEST: { maxEvents: 5, windowMs: 1000 },
    REQUEST_FULL_STATE: { maxEvents: 5, windowMs: 1000 },
    CHANGE_PLAYER_COLOR: { maxEvents: 10, windowMs: 1000 },
    SET_DISPLAY_NAME: { maxEvents: 5, windowMs: 1000 },

    // Admin commands - restricted
    ADMIN_COMMAND: { maxEvents: 10, windowMs: 10000 }, // 10 per 10 seconds
  };

  // Default limit for unknown events (generous to avoid false positives)
  private readonly defaultLimit = { maxEvents: 100, windowMs: 1000 };

  // Events exempt from rate limiting (core game loop events)
  private readonly exemptEvents = new Set(["PLAYER_INPUT"]);

  // Ban duration
  private readonly BAN_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  // Strike system - track violations before banning
  private strikes: Map<string, number> = new Map();
  private readonly STRIKES_BEFORE_BAN = 3;

  /**
   * Check if an event should be allowed and record it
   * @param socketId The socket ID
   * @param eventType The event type being sent
   * @returns Object with allowed (boolean) and shouldBan (boolean)
   */
  public checkEvent(
    socketId: string,
    eventType: string
  ): { allowed: boolean; shouldBan: boolean; reason?: string } {
    const now = Date.now();

    // Check if socket is banned
    const banExpiration = this.bannedSockets.get(socketId);
    if (banExpiration && banExpiration > now) {
      return {
        allowed: false,
        shouldBan: false,
        reason: "Socket is banned for event flooding",
      };
    }

    // Remove expired ban
    if (banExpiration && banExpiration <= now) {
      this.bannedSockets.delete(socketId);
      this.strikes.delete(socketId);
    }

    // Skip rate limiting for exempt events (like PLAYER_INPUT which is the core game loop)
    if (this.exemptEvents.has(eventType)) {
      return { allowed: true, shouldBan: false };
    }

    // Get or create socket's event tracking
    let socketEvents = this.eventCounts.get(socketId);
    if (!socketEvents) {
      socketEvents = new Map();
      this.eventCounts.set(socketId, socketEvents);
    }

    // Get limit for this event type
    const limit = this.eventLimits[eventType] || this.defaultLimit;
    const windowStart = now - limit.windowMs;

    // Get or create event timestamps
    let timestamps = socketEvents.get(eventType);
    if (!timestamps) {
      timestamps = [];
      socketEvents.set(eventType, timestamps);
    }

    // Remove old timestamps outside window
    timestamps = timestamps.filter((ts) => ts > windowStart);
    socketEvents.set(eventType, timestamps);

    // Check if over limit
    if (timestamps.length >= limit.maxEvents) {
      // Add strike
      const currentStrikes = (this.strikes.get(socketId) || 0) + 1;
      this.strikes.set(socketId, currentStrikes);

      console.warn(
        `Socket ${socketId} exceeded rate limit for ${eventType} (${timestamps.length}/${limit.maxEvents} in ${limit.windowMs}ms). Strike ${currentStrikes}/${this.STRIKES_BEFORE_BAN}`
      );

      // Check if should ban
      if (currentStrikes >= this.STRIKES_BEFORE_BAN) {
        this.bannedSockets.set(socketId, now + this.BAN_DURATION_MS);
        console.warn(
          `Socket ${socketId} banned for ${this.BAN_DURATION_MS / 1000}s due to repeated rate limit violations`
        );
        return {
          allowed: false,
          shouldBan: true,
          reason: `Banned for repeated rate limit violations on ${eventType}`,
        };
      }

      return {
        allowed: false,
        shouldBan: false,
        reason: `Rate limit exceeded for ${eventType}`,
      };
    }

    // Record this event
    timestamps.push(now);

    return { allowed: true, shouldBan: false };
  }

  /**
   * Check if a socket is currently banned
   */
  public isBanned(socketId: string): boolean {
    const banExpiration = this.bannedSockets.get(socketId);
    if (!banExpiration) return false;

    if (banExpiration <= Date.now()) {
      this.bannedSockets.delete(socketId);
      this.strikes.delete(socketId);
      return false;
    }

    return true;
  }

  /**
   * Get ban expiration time for a socket
   */
  public getBanExpiration(socketId: string): number | null {
    const expiration = this.bannedSockets.get(socketId);
    if (!expiration || expiration <= Date.now()) {
      return null;
    }
    return expiration;
  }

  /**
   * Manually ban a socket
   */
  public banSocket(socketId: string, reason: string): void {
    const now = Date.now();
    this.bannedSockets.set(socketId, now + this.BAN_DURATION_MS);
    console.warn(`Socket ${socketId} manually banned: ${reason}`);
  }

  /**
   * Remove a socket's tracking data (call on disconnect)
   */
  public removeSocket(socketId: string): void {
    this.eventCounts.delete(socketId);
    // Don't remove from bannedSockets - keep ban active even if they disconnect
  }

  /**
   * Clean up old data (call periodically)
   */
  public cleanup(): void {
    const now = Date.now();

    // Clean up expired bans
    const bannedSocketIds = Array.from(this.bannedSockets.keys());
    for (const socketId of bannedSocketIds) {
      const expiration = this.bannedSockets.get(socketId);
      if (expiration && expiration <= now) {
        this.bannedSockets.delete(socketId);
        this.strikes.delete(socketId);
      }
    }

    // Clean up event counts for sockets with no recent activity
    const eventCountSocketIds = Array.from(this.eventCounts.keys());
    for (const socketId of eventCountSocketIds) {
      const eventMap = this.eventCounts.get(socketId);
      if (!eventMap) continue;

      let hasRecentActivity = false;
      const eventTypes = Array.from(eventMap.keys());

      for (const eventType of eventTypes) {
        const timestamps = eventMap.get(eventType);
        if (!timestamps) continue;

        const limit = this.eventLimits[eventType] || this.defaultLimit;
        const windowStart = now - limit.windowMs * 10; // Keep 10x window for cleanup
        const filtered = timestamps.filter((ts) => ts > windowStart);

        if (filtered.length > 0) {
          hasRecentActivity = true;
          eventMap.set(eventType, filtered);
        } else {
          eventMap.delete(eventType);
        }
      }

      if (!hasRecentActivity) {
        this.eventCounts.delete(socketId);
      }
    }
  }
}
