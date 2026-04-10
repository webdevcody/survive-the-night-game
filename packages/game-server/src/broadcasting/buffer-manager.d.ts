import { VotingState } from "@shared/types/voting";
import { ZombieLivesState } from "@shared/types/zombie-lives";
import { IEntity } from "@/entities/types";
import { GameStateData } from "../../../game-shared/src/events/server-sent/events/game-state-event";
import { MapData } from "../../../game-shared/src/events/server-sent/events/map-event";
/**
 * Centralized buffer manager for serializing game state to buffers.
 * Maintains a reusable buffer that gets cleared after each game loop.
 */
export declare class BufferManager {
    private writer;
    private tempWriter;
    private initialSize;
    constructor(initialSize?: number);
    /**
     * Clear the buffer (reset for new game loop)
     */
    clear(): void;
    /**
     * Write an entity to the buffer
     * @param entity - The entity to serialize
     * @param onlyDirty - Whether to only serialize dirty fields/extensions. When false, serializes all fields and all extensions with all their data.
     */
    writeEntity(entity: IEntity, onlyDirty?: boolean): void;
    /**
     * Write game state metadata to the buffer using bitset approach
     * @param gameState - Game state data (wave info, etc.)
     * @param hasRemovedEntities - Whether there are removed entities (for bitset)
     * @param mapData - Optional map data to include (only for full state updates)
     * @param votingState - Optional voting state to include (during voting phase)
     * @param zombieLivesState - Optional zombie lives state to include (during infection mode)
     */
    writeGameState(gameState: Partial<GameStateData>, hasRemovedEntities?: boolean, mapData?: MapData, votingState?: VotingState, zombieLivesState?: ZombieLivesState): void;
    /**
     * Write map data to the buffer (should be called after writeRemovedEntityIds)
     * @param mapData - The map data to serialize
     */
    writeMapData(mapData: MapData): void;
    /**
     * Write voting state to the buffer (should be called after writeMapData)
     * @param votingState - The voting state to serialize
     */
    writeVotingState(votingState: VotingState): void;
    /**
     * Write zombie lives state to the buffer (should be called after writeVotingState)
     * @param zombieLivesState - The zombie lives state to serialize
     */
    writeZombieLivesState(zombieLivesState: ZombieLivesState): void;
    /**
     * Write removed entity IDs array
     * Only writes if there are actually removed entities (should be called after writeGameState)
     * @param removedIds - Array of entity IDs that were removed
     */
    writeRemovedEntityIds(removedIds: number[]): void;
    /**
     * Write entity count (for game state updates)
     * @param count - Number of entities (max 65535)
     */
    writeEntityCount(count: number): void;
    /**
     * Get the current buffer
     */
    getBuffer(): Buffer;
    /**
     * Get the current buffer length
     */
    getLength(): number;
    /**
     * Log total bytes for the current game state update
     */
    logStats(): void;
}
