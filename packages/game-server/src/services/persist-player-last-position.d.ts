import { Player } from "@/entities/players/player";
export declare function getPersistablePlayerLastTile(player: Player): {
    x: number;
    y: number;
} | null;
/**
 * Writes the player's current tile and optional campsite bind to the website DB
 * (same contract as disconnect).
 */
export declare function persistPlayerLastPositionToWebsite(userId: string, player: Player): Promise<void>;
