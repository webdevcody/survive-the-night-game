import { IEntity } from "@/entities/types";
import { WaveState } from "@shared/types/wave";
import { ENABLE_PERFORMANCE_MONITORING } from "@/config/config";

export interface DirtyEntityInfo {
  id: number;
  type: string;
  dirtyExtensions: string[];
  dirtyFields: string[];
  reason: string;
}

export class EntityStateTracker {
  private removedEntityIds: Set<number> = new Set();
  private dirtyEntities: Set<IEntity> = new Set();
  private dirtyEntityInfo: Map<number, DirtyEntityInfo> = new Map();
  private previousGameState: {
    dayNumber?: number;
    cycleStartTime?: number;
    cycleDuration?: number;
    isDay?: boolean;
    // Wave system
    waveNumber?: number;
    waveState?: WaveState;
    phaseStartTime?: number;
    phaseDuration?: number;
    totalZombies?: number;
  } = {};

  public trackRemoval(entityId: number): void {
    this.removedEntityIds.add(entityId);
  }

  public trackDirtyEntity(entity: IEntity): void {
    this.dirtyEntities.add(entity);
    
    // Track detailed information about why entity is dirty (only if performance monitoring enabled)
    if (ENABLE_PERFORMANCE_MONITORING) {
      const dirtyExtensions = entity.getDirtyExtensions().map((ext) => {
        const type = (ext.constructor as any).type || "unknown";
        return type;
      });
      
      // Get dirty fields if entity has them (check if entity has dirtyFields method/property)
      const dirtyFields: string[] = [];
      if ("dirtyFields" in entity && entity.dirtyFields instanceof Set) {
        dirtyFields.push(...Array.from(entity.dirtyFields as Set<string>));
      }
      
      const reason = dirtyExtensions.length > 0 
        ? `extensions: ${dirtyExtensions.join(", ")}`
        : dirtyFields.length > 0
        ? `fields: ${dirtyFields.join(", ")}`
        : "unknown";
      
      this.dirtyEntityInfo.set(entity.getId(), {
        id: entity.getId(),
        type: entity.getType(),
        dirtyExtensions,
        dirtyFields,
        reason,
      });
    }
  }

  public untrackDirtyEntity(entity: IEntity): void {
    this.dirtyEntities.delete(entity);
    this.dirtyEntityInfo.delete(entity.getId());
  }

  public getChangedEntities(): IEntity[] {
    // Return entities from the tracked Set instead of looping through all entities
    return Array.from(this.dirtyEntities);
  }

  public getDirtyEntityInfo(): DirtyEntityInfo[] {
    return Array.from(this.dirtyEntityInfo.values());
  }

  public clearDirtyEntityInfo(): void {
    this.dirtyEntityInfo.clear();
  }

  public getRemovedEntityIds(): number[] {
    return Array.from(this.removedEntityIds);
  }

  public clearRemovedEntityIds(): void {
    this.removedEntityIds.clear();
  }

  public getPreviousEntityState(entityId: number): any {
    // No longer tracking previous state - dirty flags handle change detection
    return null;
  }

  public getPreviousExtensionTypes(entityId: number): string[] {
    // No longer tracking extension types - entity's removedExtensions array handles this
    return [];
  }

  public clear(): void {
    this.removedEntityIds.clear();
    this.dirtyEntities.clear();
    this.dirtyEntityInfo.clear();
    this.previousGameState = {};
  }

  public trackGameState(gameState: {
    dayNumber: number;
    cycleStartTime: number;
    cycleDuration: number;
    isDay: boolean;
    // Wave system
    waveNumber?: number;
    waveState?: WaveState;
    phaseStartTime?: number;
    phaseDuration?: number;
    totalZombies?: number;
  }): void {
    this.previousGameState = { ...gameState };
  }

  public getChangedGameStateProperties(currentGameState: {
    dayNumber: number;
    cycleStartTime: number;
    cycleDuration: number;
    isDay: boolean;
    // Wave system
    waveNumber?: number;
    waveState?: WaveState;
    phaseStartTime?: number;
    phaseDuration?: number;
    totalZombies?: number;
  }): Partial<typeof currentGameState> {
    const changedProps: Partial<typeof currentGameState> = {};

    // Automatically track all properties from the current game state
    const gameStateProperties = Object.keys(currentGameState) as Array<
      keyof typeof currentGameState
    >;

    for (const prop of gameStateProperties) {
      const currentValue = currentGameState[prop];
      const previousValue = this.previousGameState[prop];
      if (currentValue !== previousValue) {
        (changedProps as Record<string, unknown>)[prop] = currentValue;
      }
    }

    return changedProps;
  }
}
