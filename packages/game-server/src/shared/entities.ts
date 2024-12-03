import { EntityManager } from "@/managers/entity-manager";

export const Entities = {
  ZOMBIE: "zombie",
  PLAYER: "player",
  TREE: "tree",
  BULLET: "bullet",
  WALL: "wall",
  BOUNDARY: "boundary",
} as const;

export type EntityType = (typeof Entities)[keyof typeof Entities];

export type RawEntity = {
  id: string;
  type: EntityType;
  [key: string]: any;
};

export abstract class Entity {
  private type: EntityType;
  private id: string;
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager, type: EntityType) {
    this.type = type;
    this.id = entityManager.generateEntityId();
    this.entityManager = entityManager;
  }

  setType(type: EntityType) {
    this.type = type;
  }

  serialize(): RawEntity {
    return {
      id: this.id,
      type: this.type,
    };
  }

  getType(): EntityType {
    return this.type;
  }

  getId(): string {
    return this.id;
  }

  setId(id: string) {
    this.id = id;
  }

  getEntityManager(): EntityManager {
    return this.entityManager;
  }
}
