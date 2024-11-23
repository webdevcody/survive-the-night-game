import { Entity } from "../shared/entities";

export class EntityManager {
  private entities: Entity[];
  private entitiesToRemove: string[] = [];
  private id: number = 0;

  constructor() {
    this.entities = [];
  }

  addEntity(entity: Entity) {
    this.entities.push(entity);
  }

  getEntities(): Entity[] {
    return this.entities;
  }

  markEntityForRemoval(entity: Entity) {
    this.entitiesToRemove.push(entity.getId());
  }

  generateEntityId(): string {
    return `${this.id++}`;
  }

  pruneEntities() {
    this.entities = this.entities.filter(
      (e) => !this.entitiesToRemove.includes(e.getId())
    );
    this.entitiesToRemove = [];
  }
}
