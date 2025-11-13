import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { RawEntity } from "@shared/types/entity";
import Positionable from "@/extensions/positionable";
import Collidable from "@/extensions/collidable";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";

export class Boundary extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.BOUNDARY);

    this.addExtension(new Positionable(this).setSize(Boundary.Size));
    this.addExtension(new Collidable(this).setSize(Boundary.Size));
  }

  setPosition(position: Vector2): void {
    this.getExt(Positionable).setPosition(position);
  }

  setSize(size: Vector2): void {
    this.getExt(Positionable).setSize(size);
    this.getExt(Collidable).setSize(size);
  }
}
