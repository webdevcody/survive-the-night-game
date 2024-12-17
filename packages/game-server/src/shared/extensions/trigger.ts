import { GenericEntity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { Vector2 } from "../physics";
import { Rectangle } from "../geom/rectangle";
import Positionable from "./positionable";

export default class Triggerable implements Extension {
  public static readonly Name = ExtensionNames.trigger;

  private self: GenericEntity;
  private size: Vector2;

  /**
   * will create a trigger box around an entity which should be used for various purposes.
   */
  public constructor(self: GenericEntity, width: number, height: number) {
    this.self = self;
    this.size = { x: width, y: height };
  }

  public getTriggerBox(): Rectangle {
    const positionable = this.self.getExt(Positionable);

    return new Rectangle(
      positionable.getPosition().x,
      positionable.getPosition().y,
      this.size.x,
      this.size.y
    );
  }

  public deserialize(data: ExtensionSerialized): this {
    this.size = { x: data.width, y: data.height };
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Triggerable.Name,
      width: this.size.x,
      height: this.size.y,
    };
  }
}
