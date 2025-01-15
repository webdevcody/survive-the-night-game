import { Extension, ExtensionSerialized } from "./types";
import { Hitbox } from "../traits";
import Positionable from "./positionable";
import { IEntity } from "../types";

export default class Collidable implements Extension {
  public static readonly type = "collidable";

  private self: IEntity;
  private size: number;
  private offset: number;
  private enabled: boolean;

  public constructor(self: IEntity) {
    this.self = self;
    this.size = 16;
    this.offset = 0;
    this.enabled = true;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    return this;
  }

  public isEnabled() {
    return this.enabled;
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
      type: Collidable.type,
      offset: this.offset,
      size: this.size,
    };
  }
}
