import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import { IEntity } from "@/entities/types";
import { ItemState } from "@/types/entity";
/**
 * A bear trap that snares zombies (and players in Battle Royale) when they step on it
 * The trap can be rearmed after being triggered (by the owner)
 * Trapped players must pick up the trap to free themselves
 */
export declare class BearTrap extends Entity implements IEntity {
    private static get SIZE();
    private static readonly TRIGGER_RADIUS;
    static readonly DEFAULT_COUNT = 1;
    private triggerExtension;
    private interactiveExtension;
    constructor(gameManagers: IGameManagers, itemState?: ItemState);
    activate(): void;
    private setIsArmed;
    private setSnaredEntityId;
    private getSnaredEntityId;
    updateBearTrap(deltaTime: number): void;
    private snare;
    private releaseSnaredEntity;
    private interact;
}
