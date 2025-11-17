import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

type UpdateFunction = (deltaTime: number) => void;

export default class Updatable implements Extension {
  public static readonly type = "updatable";

  private self: IEntity;
  private updateFunction: UpdateFunction;
  private dirty: boolean = false;

  /**
   * will create a trigger box around an entity which should be used for various purposes.
   */
  public constructor(self: IEntity, updateFunction: UpdateFunction) {
    this.self = self;
    this.updateFunction = updateFunction;
  }

  public setUpdateFunction(cb: UpdateFunction) {
    this.updateFunction = cb;
    return this;
  }

  public update(deltaTime: number) {
    this.updateFunction(deltaTime);
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
    writer.writeUInt8(encodeExtensionType(Updatable.type));
  }
}
