import { IEntity } from "@/entities/types";
import copy from "fast-copy";

export class EntityStateTracker {
  private previousEntityStates: Map<string, any> = new Map();
  private removedEntityIds: Set<string> = new Set();
  private previousGameState: {
    dayNumber?: number;
    cycleStartTime?: number;
    cycleDuration?: number;
    isDay?: boolean;
  } = {};

  public trackEntity(entity: IEntity, currentTime: number): void {
    const id = entity.getId();
    const serialized = entity.serialize();
    this.previousEntityStates.set(id, {
      serialized: copy(serialized),
      lastUpdateTime: currentTime,
    });
  }

  public trackRemoval(entityId: string): void {
    this.removedEntityIds.add(entityId);
    this.previousEntityStates.delete(entityId);
  }

  public getChangedEntities(entities: IEntity[]): IEntity[] {
    const changedEntities: IEntity[] = [];

    for (const entity of entities) {
      const id = entity.getId();
      const currentState = entity.serialize();
      const previousState = this.previousEntityStates.get(id);

      if (!previousState) {
        // New entity
        changedEntities.push(entity);
        // Don't track here - we'll track in broadcastEvent when we know the entity is actually being sent
        continue;
      }

      // Check if any meaningful properties changed
      let hasChanges = false;

      // Compare extensions first
      const currentExtensions = currentState.extensions || [];
      const previousExtensions = previousState.serialized.extensions || [];

      // Check for added or modified extensions
      for (const ext of currentExtensions) {
        const prevExt = previousExtensions.find((pe: any) => pe.type === ext.type);
        if (!prevExt) {
          hasChanges = true;
          break;
        }

        // Compare extension properties excluding type
        const { type: _t1, ...extProps } = ext;
        const { type: _t2, ...prevExtProps } = prevExt;

        if (JSON.stringify(extProps) !== JSON.stringify(prevExtProps)) {
          hasChanges = true;
          break;
        }
      }

      // Check for removed extensions
      if (!hasChanges) {
        const removedExtensions = previousExtensions
          .filter((pe: any) => !currentExtensions.find((e: any) => e.type === pe.type))
          .map((pe: any) => pe.type);

        if (removedExtensions.length > 0) {
          hasChanges = true;
        }
      }

      // Compare top level properties
      if (!hasChanges) {
        for (const [key, value] of Object.entries(currentState)) {
          if (key === "id" || key === "type" || key === "extensions") continue;
          if (JSON.stringify(value) !== JSON.stringify(previousState.serialized[key])) {
            hasChanges = true;
            break;
          }
        }
      }

      if (hasChanges) {
        changedEntities.push(entity);
      }
    }

    return changedEntities;
  }

  public getRemovedEntityIds(): string[] {
    return Array.from(this.removedEntityIds);
  }

  public getPreviousEntityState(entityId: string): any {
    const state = this.previousEntityStates.get(entityId);
    return state ? state.serialized : null;
  }

  public clear(): void {
    this.previousEntityStates.clear();
    this.removedEntityIds.clear();
    this.previousGameState = {};
  }

  public trackGameState(gameState: {
    dayNumber: number;
    cycleStartTime: number;
    cycleDuration: number;
    isDay: boolean;
  }): void {
    this.previousGameState = { ...gameState };
  }

  public getChangedGameStateProperties(currentGameState: {
    dayNumber: number;
    cycleStartTime: number;
    cycleDuration: number;
    isDay: boolean;
  }): Partial<typeof currentGameState> {
    const changedProps: Partial<typeof currentGameState> = {};

    // Always include timestamp-related properties if they've changed at all
    if (currentGameState.cycleStartTime !== this.previousGameState.cycleStartTime) {
      changedProps.cycleStartTime = currentGameState.cycleStartTime;
    }

    if (currentGameState.cycleDuration !== this.previousGameState.cycleDuration) {
      changedProps.cycleDuration = currentGameState.cycleDuration;
    }

    // For boolean and number properties, use direct comparison
    if (currentGameState.isDay !== this.previousGameState.isDay) {
      changedProps.isDay = currentGameState.isDay;
    }

    if (currentGameState.dayNumber !== this.previousGameState.dayNumber) {
      changedProps.dayNumber = currentGameState.dayNumber;
    }

    return changedProps;
  }
}
