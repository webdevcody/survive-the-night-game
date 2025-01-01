import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { GenericEntity } from "../entities";
import { Hitbox } from "../traits";
import Positionable from "./positionable";

export default class Collidable implements Extension {
  public static readonly Name = ExtensionNames.collidable;

  private self: GenericEntity;
  private size: number;
  private offset: number;

  public constructor(self: GenericEntity) {
    this.self = self;
    this.size = 16;
    this.offset = 0;
  }

  public setSize(newSize: number) {
    this.size = newSize;
    return this;
  }

  public getSize(): number {
    return this.size;
  }

  public setOffset(newOffset: number) {
    this.offset = newOffset;
    return this;
  }

  public getHitBox(): Hitbox {
    const positionable = this.self.getExt(Positionable);

    const position = positionable.getPosition();

    position.x += this.offset;
    position.y += this.offset;

    return {
      ...position,
      width: this.size,
      height: this.size,
    };
  }

  public deserialize(data: ExtensionSerialized): this {
    this.offset = data.offset;
    this.size = data.size;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Collidable.Name,
      offset: this.offset,
      size: this.size,
    };
  }
}
