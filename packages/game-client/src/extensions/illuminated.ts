import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";
import { getConfig } from "@shared/config";

export class ClientIlluminated extends BaseClientExtension {
  public static readonly type = ExtensionTypes.ILLUMINATED;

  private radius = getConfig().world.LIGHT_RADIUS_FIRE;

  public getRadius(): number {
    return this.radius;
  }

  public setRadius(radius: number): this {
    this.radius = radius;
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.radius = reader.readUInt16();
    return this;
  }
}
