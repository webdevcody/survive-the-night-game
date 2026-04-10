/**
 * Cache mapping socketId to userId for authenticated players
 * This allows tracking game rewards without exposing user IDs over WebSocket
 */
export declare class UserSessionCache {
    private static instance;
    private socketToUser;
    private userToSocket;
    private socketToToken;
    static getInstance(): UserSessionCache;
    /**
     * Associate a socket with an authenticated user
     */
    setUserSession(socketId: string, userId: string, sessionToken: string): void;
    /**
     * Get userId for a socket (returns null if anonymous)
     */
    getUserIdBySocket(socketId: string): string | null;
    /**
     * Get socketId for a userId (returns null if not connected)
     */
    getSocketIdByUser(userId: string): string | null;
    /**
     * Check if a socket is authenticated
     */
    isAuthenticated(socketId: string): boolean;
    /**
     * Remove a socket's session (on disconnect)
     */
    removeSocket(socketId: string): void;
    /**
     * Get session token for a socket (for cache cleanup)
     */
    getTokenBySocket(socketId: string): string | null;
    /**
     * Get all authenticated socket IDs
     */
    getAuthenticatedSocketIds(): string[];
    /**
     * Get count of authenticated users
     */
    getAuthenticatedCount(): number;
}
