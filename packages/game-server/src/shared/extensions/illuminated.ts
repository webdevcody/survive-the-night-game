import { Entity } from "../entity";
import { Extension, ExtensionSerialized } from "./types";

export default class Illuminated implements Extension {
  public static readonly type = "illuminated";

  private self: Entity;
  private radius: number;

  public constructor(self: Entity, radius: number = 150) {
    this.self = self;
    this.radius = radius;
  }

  public getRadius(): number {
    return this.radius;
  }

  public setRadius(radius: number): this {
    this.radius = radius;
    return this;
  }

  public deserialize(data: ExtensionSerialized): this {
    this.radius = data.radius;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Illuminated.type,
      radius: this.radius,
    };
  }
}

export { Illuminated };
