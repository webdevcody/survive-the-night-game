import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import { getConfig } from "@shared/config";

type IlluminatedFields = {
  radius: number;
};

export default class Illuminated extends ExtensionBase<IlluminatedFields> {
  public static readonly type = "illuminated";

  constructor(self: IEntity, radius: number = getConfig().world.LIGHT_RADIUS_FIRE) {
    super(self, { radius });
  }

  public getRadius(): number {
    return this.serialized.get('radius');
  }

  public setRadius(radius: number): this {
    this.serialized.set('radius', radius);
    return this;
  }

  public serializeToBuffer(
    writer: BufferWriter,
    onlyDirty: boolean = false
  ): void {
    writer.writeUInt8(encodeExtensionType(Illuminated.type));
    writer.writeUInt16(this.serialized.get('radius'));
  }
}

export { Illuminated };
