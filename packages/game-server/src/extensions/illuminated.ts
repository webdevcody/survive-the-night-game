import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";

export default class Illuminated implements Extension {
  public static readonly type = "illuminated";

  private self: IEntity;
  private radius: number;

  public constructor(self: IEntity, radius: number = 150) {
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

  public serialize(): ExtensionSerialized {
    return {
      type: Illuminated.type,
      radius: this.radius,
    };
  }
}

export { Illuminated };
