import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

export default class Illuminated extends ExtensionBase {
  public static readonly type = "illuminated";

  constructor(self: IEntity, radius: number = 150) {
    super(self, { radius });
  }

  public getRadius(): number {
    const serialized = this.serialized as any;
    return serialized.radius;
  }

  public setRadius(radius: number): this {
    const serialized = this.serialized as any;
    serialized.radius = radius;
    return this;
  }

  public serializeToBuffer(
    writer: BufferWriter,
    onlyDirty: boolean = false
  ): void {
    const serialized = this.serialized as any;
    writer.writeUInt8(encodeExtensionType(Illuminated.type));
    writer.writeUInt16(serialized.radius);
  }
}

export { Illuminated };
