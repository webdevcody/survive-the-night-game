import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

export default class Illuminated implements Extension {
  public static readonly type = "illuminated";

  private self: IEntity;
  private radius: number;
  private dirty: boolean = false;

  public constructor(self: IEntity, radius: number = 150) {
    this.self = self;
    this.radius = radius;
  }

  public getRadius(): number {
    return this.radius;
  }

  public setRadius(radius: number): this {
    const radiusChanged = this.radius !== radius;
    this.radius = radius;
    if (radiusChanged) {
      this.markDirty();
    }
    return this;
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public serializeToBuffer(writer: BufferWriter): void {
    writer.writeUInt32(encodeExtensionType(Illuminated.type));
    writer.writeFloat64(this.radius);
  }
}

export { Illuminated };
