import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

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

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    // Read field count (always present now)
    const fieldCount = reader.readUInt8();
    
    // Read fields by index
    for (let i = 0; i < fieldCount; i++) {
      const fieldIndex = reader.readUInt8();
      // Field index: radius = 0
      if (fieldIndex === 0) {
        this.radius = reader.readUInt16();
      }
    }
    return this;
  }
}
