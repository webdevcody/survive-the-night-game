import { EntityType } from "@survive-the-night/game-shared";
import { EntityManager } from "../managers/entity-manager";
import { GenericEntity } from "./generic-entity";

export abstract class Entity extends GenericEntity {
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager, type: EntityType) {
    super({
      id: entityManager.generateEntityId(),
      type,
    });

    this.entityManager = entityManager;
  }

  public getEntityManager(): EntityManager {
    return this.entityManager;
  }
}
