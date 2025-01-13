import { IEntityManager } from "../../managers/types";
import { ServerOnly } from "../traits";
import { Vector2 } from "../physics";
import { Entity } from "../entity";
import { Entities } from "@survive-the-night/game-shared/src/constants";
import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";
import Positionable from "../extensions/positionable";
import Collidable from "../extensions/collidable";

export class Boundary extends Entity implements ServerOnly {
  constructor(entityManager: IEntityManager) {
    super(entityManager, Entities.BOUNDARY);

    this.extensions = [new Positionable(this).setSize(16), new Collidable(this).setSize(16)];
  }

  isServerOnly(): boolean {
    return true;
  }

  setPosition(position: Vector2): void {
    this.getExt(Positionable).setPosition(position);
  }

  setSize(size: Vector2): void {
    const sizeValue = Math.max(size.x, size.y);
    this.getExt(Positionable).setSize(sizeValue);
    this.getExt(Collidable).setSize(sizeValue);
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      position: this.getExt(Positionable).getPosition(),
    };
  }
}
