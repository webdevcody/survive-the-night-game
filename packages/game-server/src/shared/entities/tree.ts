import { EntityManager } from "@/managers/entity-manager";
import { Entities, Entity, RawEntity } from "../entities";
import { Vector2 } from "../physics";
import { Harvestable, Positionable } from "../traits";

export class Tree extends Entity implements Harvestable, Positionable {
  private isHarvested = false;
  private position: Vector2 = { x: 0, y: 0 };

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.TREE);
  }

  harvest(): void {
    this.isHarvested = true;
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      position: this.position,
    };
  }

  getIsHarvested(): boolean {
    return this.isHarvested;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(position: Vector2) {
    this.position = position;
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }
}
