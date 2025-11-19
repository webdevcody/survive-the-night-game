import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

type UpdateFunction = (deltaTime: number) => void;

export default class Updatable extends ExtensionBase {
  public static readonly type = "updatable";

  private updateFunction: UpdateFunction;

  /**
   * will create a trigger box around an entity which should be used for various purposes.
   */
  public constructor(self: IEntity, updateFunction: UpdateFunction) {
    super(self, {});
    this.updateFunction = updateFunction;
  }

  public setUpdateFunction(cb: UpdateFunction) {
    this.updateFunction = cb;
    return this;
  }

  public update(deltaTime: number) {
    this.updateFunction(deltaTime);
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Updatable.type));
  }
}
