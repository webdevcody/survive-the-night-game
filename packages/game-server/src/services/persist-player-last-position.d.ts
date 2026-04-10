import { Player } from "@/entities/players/player";
/**
 * Writes the player's current tile and optional campsite bind to the website DB
 * (same contract as disconnect).
 */
export declare function persistPlayerLastPositionToWebsite(userId: string, player: Player): Promise<void>;
