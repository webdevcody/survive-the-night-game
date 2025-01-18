import { Extension, ExtensionSerialized } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { ExtensionTypes } from "@/util/extension-types";
import Vector2 from "@shared/util/vector2";

export default class Positionable implements Extension {
  public static readonly type = ExtensionTypes.POSITIONABLE;

  private self: IEntity;
  private position: Vector2 = new Vector2(0, 0);
  private size: Vector2 = new Vector2(0, 0);

  public constructor(self: IEntity) {
    this.self = self;
  }

  public getSize(): Vector2 {
    return this.size.clone();
  }

  public setSize(size: Vector2): this {
    this.size = size;
    return this;
  }

  public getCenterPosition(): Vector2 {
    return this.size.div(2).add(this.position);
  }

  public getPosition(): Vector2 {
    return this.position.clone();
  }

  public setPosition(position: Vector2): this {
    this.position = position;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Positionable.type,
      position: this.position,
      size: this.size,
    };
  }
}
