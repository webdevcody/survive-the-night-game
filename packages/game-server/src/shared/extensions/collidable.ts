import { Extension, ExtensionSerialized } from "./types";
import { Hitbox } from "../traits";
import Positionable from "./positionable";
import { Entity } from "../entity";

export default class Collidable implements Extension {
  public static readonly type = "collidable";

  private serialized?: ExtensionSerialized;
  private self: Entity;
  private size: number;
  private offset: number;
  private enabled: boolean;

  public constructor(self: Entity) {
    this.self = self;
    this.size = 16;
    this.offset = 0;
    this.enabled = true;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.serialized = undefined;
    return this;
  }

  public isEnabled() {
    return this.enabled;
  }

  public setSize(newSize: number) {
    this.size = newSize;
    this.serialized = undefined;

    return this;
  }

  public getSize(): number {
    return this.size;
  }

  public setOffset(newOffset: number) {
    this.offset = newOffset;
    this.serialized = undefined;
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
    if (!this.serialized) {
      this.serialized = {
        type: Collidable.type,
        offset: this.offset,
        size: this.size,
      };
    }

    return this.serialized;
  }
}
