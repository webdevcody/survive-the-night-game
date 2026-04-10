import { Player } from "@/entities/players/player";
/**
 * Writes quest journal to the website DB when progress changes in-game.
 * Authenticated players only; fire-and-forget.
 */
export declare function queuePersistQuestProgressToWebsite(player: Player): void;
