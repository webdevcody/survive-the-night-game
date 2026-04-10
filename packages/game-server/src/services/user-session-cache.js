/**
 * Cache mapping socketId to userId for authenticated players
 * This allows tracking game rewards without exposing user IDs over WebSocket
 */
export class UserSessionCache {
    constructor() {
        // socketId -> userId
        this.socketToUser = new Map();
        // userId -> socketId (for reverse lookup)
        this.userToSocket = new Map();
        // socketId -> session token (for cache invalidation)
        this.socketToToken = new Map();
    }
    static getInstance() {
        if (!UserSessionCache.instance) {
            UserSessionCache.instance = new UserSessionCache();
        }
        return UserSessionCache.instance;
    }
    /**
     * Associate a socket with an authenticated user
     */
    setUserSession(socketId, userId, sessionToken) {
        // Clean up any existing session for this user (handles reconnection)
        const existingSocket = this.userToSocket.get(userId);
        if (existingSocket && existingSocket !== socketId) {
            this.removeSocket(existingSocket);
        }
        this.socketToUser.set(socketId, userId);
        this.userToSocket.set(userId, socketId);
        this.socketToToken.set(socketId, sessionToken);
    }
    /**
     * Get userId for a socket (returns null if anonymous)
     */
    getUserIdBySocket(socketId) {
        return this.socketToUser.get(socketId) || null;
    }
    /**
     * Get socketId for a userId (returns null if not connected)
     */
    getSocketIdByUser(userId) {
        return this.userToSocket.get(userId) || null;
    }
    /**
     * Check if a socket is authenticated
     */
    isAuthenticated(socketId) {
        return this.socketToUser.has(socketId);
    }
    /**
     * Remove a socket's session (on disconnect)
     */
    removeSocket(socketId) {
        const userId = this.socketToUser.get(socketId);
        if (userId) {
            this.userToSocket.delete(userId);
        }
        this.socketToUser.delete(socketId);
        this.socketToToken.delete(socketId);
    }
    /**
     * Get session token for a socket (for cache cleanup)
     */
    getTokenBySocket(socketId) {
        return this.socketToToken.get(socketId) || null;
    }
    /**
     * Get all authenticated socket IDs
     */
    getAuthenticatedSocketIds() {
        return Array.from(this.socketToUser.keys());
    }
    /**
     * Get count of authenticated users
     */
    getAuthenticatedCount() {
        return this.socketToUser.size;
    }
}
