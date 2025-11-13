import { IEntity } from "@/entities/types";
import { WaveState } from "@shared/types/wave";

export class EntityStateTracker {
  private removedEntityIds: Set<string> = new Set();
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

  public trackRemoval(entityId: string): void {
    this.removedEntityIds.add(entityId);
  }

  public getChangedEntities(entities: IEntity[]): IEntity[] {
    const changedEntities: IEntity[] = [];

    for (const entity of entities) {
      // Use dirty flag to detect changes (includes removed extensions check)
      // New entities will have all extensions dirty, changed entities will have dirty extensions
      // This is much faster than serialization comparison
      if (entity.isDirty()) {
        changedEntities.push(entity);
      }
    }

    return changedEntities;
  }

  public getRemovedEntityIds(): string[] {
    return Array.from(this.removedEntityIds);
  }

  public clearRemovedEntityIds(): void {
    this.removedEntityIds.clear();
  }

  public getPreviousEntityState(entityId: string): any {
    // No longer tracking previous state - dirty flags handle change detection
    return null;
  }

  public getPreviousExtensionTypes(entityId: string): string[] {
    // No longer tracking extension types - entity's removedExtensions array handles this
    return [];
  }

  public clear(): void {
    this.removedEntityIds.clear();
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
