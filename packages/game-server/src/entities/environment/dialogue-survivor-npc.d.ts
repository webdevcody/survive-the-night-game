import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import type { WorldMapDialogueNpcEntry } from "@shared/map/world-map-types";
/**
 * Static NPC using the survivor sprite; dialogue is authored in world-map.json.
 */
export declare class DialogueSurvivorNpc extends Entity {
    constructor(gameManagers: IGameManagers, entry: WorldMapDialogueNpcEntry, tileX: number, tileY: number);
}
