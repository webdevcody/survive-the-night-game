import { IGameManagers } from "@/managers/types";
/**
 * Manages the lifecycle of AI players in Battle Royale mode
 */
export declare class AIPlayerManager {
    private gameManagers;
    private aiPlayers;
    constructor(gameManagers: IGameManagers);
    /**
     * Spawn AI players at game start
     */
    spawnAIPlayers(count?: number): void;
    /**
     * Spawn a single AI player (public for dynamic adjustment)
     */
    spawnSingleAIPlayer(): void;
    /**
     * Hook damage events to notify AI controller when taking damage
     * This is the KEY connection for damage-based threat prioritization
     */
    private hookDamageEvents;
    /**
     * Update all AI players - called each game tick
     */
    update(deltaTime: number): void;
    /**
     * Get count of alive AI players
     */
    getAliveCount(): number;
    /**
     * Clean up all AI players (on game end)
     */
    cleanup(): void;
    /**
     * Check if an entity ID belongs to an AI player
     */
    isAIPlayer(entityId: number): boolean;
    /**
     * Get current AI player count
     */
    getAIPlayerCount(): number;
    /**
     * Remove a random AI player from the game
     * @returns true if an AI player was removed, false if no AI players exist
     */
    removeRandomAIPlayer(): boolean;
    /**
     * Adjust AI player count based on real player count.
     * Spawns or removes AI players to maintain the configured threshold.
     * @param realPlayerCount Number of real (non-AI) players in the game
     */
    adjustAIPlayerCount(realPlayerCount: number): void;
}
