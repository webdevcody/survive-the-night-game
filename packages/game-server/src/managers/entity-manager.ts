import { distance, Vector2 } from "@/shared/physics";
import { Entity } from "../shared/entities";
import { Harvestable, Positionable } from "@/shared/traits";

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
    this.entities = this.entities.filter((e) => !this.entitiesToRemove.includes(e.getId()));
    this.entitiesToRemove = [];
  }

  clear() {
    this.entities = [];
  }

  addEntities(entities: Entity[]) {
    this.entities.push(...entities);
  }

  getNearbyEntities(position: Vector2, radius: number): Entity[] {
    return this.getPositionableEntities().filter((entity) => {
      return distance(entity.getPosition(), position) <= radius;
    }) as unknown as Entity[];
  }

  getPositionableEntities(): Positionable[] {
    return this.entities.filter((entity) => {
      return "getPosition" in entity;
    }) as unknown as Positionable[];
  }

  filterHarvestableEntities(entities: Entity[]): Harvestable[] {
    return entities.filter((entity) => {
      return "harvest" in entity;
    }) as unknown as Harvestable[];
  }
}
