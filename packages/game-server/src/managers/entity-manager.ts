import { distance, isColliding, Vector2 } from "@/shared/physics";
import { Entities, Entity } from "../shared/entities";
import { Collidable, Harvestable, Positionable, Updatable } from "@/shared/traits";
import { Player } from "@/shared/entities/player";

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

  getUpdatableEntities(): Updatable[] {
    return this.entities.filter((entity) => {
      return "update" in entity;
    }) as unknown as Updatable[];
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

  getPlayerEntities(): Player[] {
    return this.entities.filter((entity) => {
      return entity.getType() === Entities.PLAYER;
    }) as unknown as Player[];
  }

  filterHarvestableEntities(entities: Entity[]): Harvestable[] {
    return entities.filter((entity) => {
      return "harvest" in entity;
    }) as unknown as Harvestable[];
  }

  getCollidableEntities(): Collidable[] {
    return this.entities.filter((entity) => {
      return "getHitbox" in entity;
    }) as unknown as Collidable[];
  }

  getClosestPlayer(entity: Positionable): Player | null {
    const players = this.getPlayerEntities();

    if (players.length === 0) {
      return null;
    }

    const entityPosition = entity.getPosition();
    let closestPlayerIdx = 0;
    let closestPlayerDistance = distance(entityPosition, players[closestPlayerIdx].getPosition());

    for (let i = 1; i < players.length; i++) {
      const player = players[i];
      const playerDistance = distance(entityPosition, player.getPosition());

      if (playerDistance < closestPlayerDistance) {
        closestPlayerIdx = i;
        closestPlayerDistance = playerDistance;
      }
    }

    return players[closestPlayerIdx];
  }

  isColliding(entity: Collidable): Collidable | null {
    const collidables = this.getCollidableEntities();
    for (const collidable of collidables) {
      if (collidable === entity) continue;
      if (isColliding(entity.getHitbox(), collidable.getHitbox())) {
        return collidable;
      }
    }
    return null;
  }
}
