import { EntityManager } from "@/managers/entity-manager";
import { Entity, Entities, RawEntity } from "../entities";
import { Collidable, Harvestable, Hitbox, Positionable } from "../traits";
import { Vector2 } from "../physics";
import { Player } from "./player";

export class Wall extends Entity implements Collidable, Positionable, Harvestable {
  private position: Vector2 = {
    x: 0,
    y: 0,
  };

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.WALL);
  }

  getPosition(): Vector2 {
    return this.position;
  }

  harvest(player: Player): void {
    if (player.isInventoryFull()) {
      return;
    }
    player.getInventory().push({
      key: "Wall",
    });
    this.getEntityManager().markEntityForRemoval(this);
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      position: this.position,
    };
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  getHitbox(): Hitbox {
    return {
      ...this.position,
      width: 16,
      height: 16,
    };
  }
}
