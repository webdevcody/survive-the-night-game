import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { GenericEntity } from "../entities";
import { Hitbox } from "../traits";
import Positionable from "./positionable";

export default class Collidable implements Extension {
  public static readonly Name = ExtensionNames.collidable;

  private self: GenericEntity;

  public constructor(self: GenericEntity) {
    this.self = self;
  }

  public getHitBox(): Hitbox {
    const positionable = this.self.getExt(Positionable);

    return {
      ...positionable.getPosition(),
      width: positionable.getSize(),
      height: positionable.getSize(),
    };
  }

  public deserialize(data: ExtensionSerialized): this {
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Collidable.Name,
    };
  }
}
