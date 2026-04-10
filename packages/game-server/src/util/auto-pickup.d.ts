import { IEntity } from "@/entities/types";
import { Player } from "@/entities/players/player";
/**
 * Determines if an item should be auto-picked up when walked over.
 * Uses shared auto-pickup rules logic.
 */
export declare function shouldAutoPickup(entity: IEntity, player: Player): boolean;
/**
 * Attempts to auto-pickup an entity for a player.
 * Returns true if pickup was successful.
 */
export declare function attemptAutoPickup(entity: IEntity, player: Player): boolean;
