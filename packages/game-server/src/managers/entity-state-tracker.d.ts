import { IEntity } from "@/entities/types";
export interface DirtyEntityInfo {
    id: number;
    type: string;
    dirtyExtensions: string[];
    dirtyFields: string[];
    reason: string;
}
export declare class EntityStateTracker {
    private removedEntityIds;
    private dirtyEntities;
    private dirtyEntityInfo;
    private previousGameState;
    trackRemoval(entityId: number): void;
    trackDirtyEntity(entity: IEntity): void;
    untrackDirtyEntity(entity: IEntity): void;
    getChangedEntities(): IEntity[];
    getDirtyEntityInfo(): DirtyEntityInfo[];
    clearDirtyEntityInfo(): void;
    getRemovedEntityIds(): number[];
    clearRemovedEntityIds(): void;
    getPreviousEntityState(entityId: number): any;
    getPreviousExtensionTypes(entityId: number): string[];
    clear(): void;
    trackGameState(gameState: {
        phaseStartTime?: number;
        phaseDuration?: number;
    }): void;
    getChangedGameStateProperties(currentGameState: {
        phaseStartTime?: number;
        phaseDuration?: number;
    }): Partial<typeof currentGameState>;
}
