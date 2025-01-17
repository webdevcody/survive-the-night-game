import { IEntity } from "@/entities/types";

interface EntityStateSnapshot {
  serialized: any;
  lastUpdateTime: number;
}

export class EntityStateTracker {
  private previousStates: Map<string, EntityStateSnapshot> = new Map();
  private removedEntityIds: Set<string> = new Set();

  public trackEntity(entity: IEntity): void {
    const id = entity.getId();
    const serialized = entity.serialize();
    this.previousStates.set(id, {
      serialized,
      lastUpdateTime: Date.now(),
    });
  }

  public trackRemoval(entityId: string): void {
    this.removedEntityIds.add(entityId);
    this.previousStates.delete(entityId);
  }

  public getChangedEntities(entities: IEntity[]): IEntity[] {
    const changedEntities: IEntity[] = [];

    for (const entity of entities) {
      const id = entity.getId();
      const currentState = entity.serialize();
      const previousState = this.previousStates.get(id);

      if (!previousState) {
        // New entity
        changedEntities.push(entity);
        this.trackEntity(entity);
        continue;
      }

      // Check if entity state changed
      if (JSON.stringify(currentState) !== JSON.stringify(previousState.serialized)) {
        changedEntities.push(entity);
        this.trackEntity(entity);
      }
    }

    return changedEntities;
  }

  public getRemovedEntityIds(): string[] {
    const ids = Array.from(this.removedEntityIds);
    this.removedEntityIds.clear();
    return ids;
  }

  public clear(): void {
    this.previousStates.clear();
    this.removedEntityIds.clear();
  }
}
