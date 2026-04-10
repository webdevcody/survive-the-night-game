import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
/** Map-placed interactable sign; lines are authored in world-map.json `messageDecals`. */
export declare class MessageDecal extends Entity {
    constructor(gameManagers: IGameManagers, dialogueLines: string[], tileX: number, tileY: number);
}
