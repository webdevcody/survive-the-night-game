import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { RawEntity } from "@shared/types/entity";
import Positionable from "@/extensions/positionable";
import Collidable from "@/extensions/collidable";
import { Entity } from "@/entities/entity";
import { ServerOnly } from "../../../../game-shared/src/util/hitbox";
import { Vector2 } from "../../../../game-shared/src/util/physics";

export class Boundary extends Entity implements ServerOnly {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.BOUNDARY);

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
