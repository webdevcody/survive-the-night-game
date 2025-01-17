import { IEntity } from "@/entities/types";
import Positionable from "@/extensions/positionable";
import { Extension, ExtensionSerialized } from "@/extensions/types";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import Movable from "./movable";

export default class Collidable implements Extension {
  public static readonly type = "collidable";

  private self: IEntity;
  private size: Vector2 = new Vector2(16, 16);
  private offset: Vector2 = new Vector2(0, 0);
  private enabled: boolean;

  public constructor(self: IEntity) {
    this.self = self;
    this.enabled = true;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    return this;
  }

  public isEnabled() {
    return this.enabled;
  }

  public setSize(size: Vector2) {
    this.size = size;
    return this;
  }

  public getSize(): Vector2 {
    return this.size.clone();
  }

  public setOffset(offset: Vector2) {
    this.offset = offset;
    return this;
  }

  public getHitBox(): Rectangle {
    const positionable = this.self.getExt(Positionable);
    const position = positionable.getPosition();
    const size = positionable.getSize();

    return new Rectangle(position.add(this.offset), size);
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Collidable.type,
      offset: this.offset,
      size: this.size,
    };
  }
}
