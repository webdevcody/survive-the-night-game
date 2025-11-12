import { IEntity } from "@/entities/types";
import { WaveState } from "@shared/types/wave";

export class EntityStateTracker {
  private seenEntityIds: Set<string> = new Set(); // Track which entities we've seen before
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
    zombiesRemaining?: number;
    totalZombies?: number;
  } = {};

  public trackEntity(entity: IEntity, currentTime: number): void {
    const id = entity.getId();
    // Just mark that we've seen this entity - dirty flags handle change detection
    this.seenEntityIds.add(id);
  }

  public trackRemoval(entityId: string): void {
    this.removedEntityIds.add(entityId);
    this.seenEntityIds.delete(entityId);
  }

  public getChangedEntities(entities: IEntity[]): IEntity[] {
    const changedEntities: IEntity[] = [];

    for (const entity of entities) {
      const id = entity.getId();
      const isNewEntity = !this.seenEntityIds.has(id);

      if (isNewEntity) {
        // New entity - always include it
        changedEntities.push(entity);
        continue;
      }

      // Use dirty flag to detect changes (includes removed extensions check)
      // This is much faster than serialization comparison
      if (entity.isDirty && entity.isDirty()) {
        changedEntities.push(entity);
      }
    }

    return changedEntities;
  }

  public getRemovedEntityIds(): string[] {
    return Array.from(this.removedEntityIds);
  }

  public getPreviousEntityState(entityId: string): any {
    // No longer tracking previous state - dirty flags handle change detection
    return null;
  }

  public getPreviousExtensionTypes(entityId: string): string[] {
    // No longer tracking extension types - entity's removedExtensions array handles this
    return [];
  }

  public hasSeenEntity(entityId: string): boolean {
    return this.seenEntityIds.has(entityId);
  }

  public clear(): void {
    this.seenEntityIds.clear();
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
    zombiesRemaining?: number;
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
    zombiesRemaining?: number;
    totalZombies?: number;
  }): Partial<typeof currentGameState> {
    const changedProps: Partial<typeof currentGameState> = {};

    // Legacy day/night cycle properties
    if (currentGameState.cycleStartTime !== this.previousGameState.cycleStartTime) {
      changedProps.cycleStartTime = currentGameState.cycleStartTime;
    }

    if (currentGameState.cycleDuration !== this.previousGameState.cycleDuration) {
      changedProps.cycleDuration = currentGameState.cycleDuration;
    }

    if (currentGameState.isDay !== this.previousGameState.isDay) {
      changedProps.isDay = currentGameState.isDay;
    }

    if (currentGameState.dayNumber !== this.previousGameState.dayNumber) {
      changedProps.dayNumber = currentGameState.dayNumber;
    }

    // Wave system properties
    if (currentGameState.waveNumber !== this.previousGameState.waveNumber) {
      changedProps.waveNumber = currentGameState.waveNumber;
    }

    if (currentGameState.waveState !== this.previousGameState.waveState) {
      changedProps.waveState = currentGameState.waveState;
    }

    if (currentGameState.phaseStartTime !== this.previousGameState.phaseStartTime) {
      changedProps.phaseStartTime = currentGameState.phaseStartTime;
    }

    if (currentGameState.phaseDuration !== this.previousGameState.phaseDuration) {
      changedProps.phaseDuration = currentGameState.phaseDuration;
    }

    if (currentGameState.zombiesRemaining !== this.previousGameState.zombiesRemaining) {
      changedProps.zombiesRemaining = currentGameState.zombiesRemaining;
    }

    if (currentGameState.totalZombies !== this.previousGameState.totalZombies) {
      changedProps.totalZombies = currentGameState.totalZombies;
    }

    return changedProps;
  }
}
