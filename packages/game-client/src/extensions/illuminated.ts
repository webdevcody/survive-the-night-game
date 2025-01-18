import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";

export class ClientIlluminated extends BaseClientExtension {
  public static readonly type = ExtensionTypes.ILLUMINATED;

  private radius = 150;

  public getRadius(): number {
    return this.radius;
  }

  public setRadius(radius: number): this {
    this.radius = radius;
    return this;
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.radius = data.radius;
    return this;
  }
}
