import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

type ConsumableHandler = (entityId: number, idx: number) => void;

export default class Consumable extends ExtensionBase {
  public static readonly type = "consumable";

  private handler: ConsumableHandler | null = null;

  public constructor(self: IEntity) {
    super(self, {});
  }

  public onConsume(handler: ConsumableHandler): this {
    this.handler = handler;
    return this;
  }

  public consume(entityId: number, idx: number): void {
    this.handler?.(entityId, idx);
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Consumable.type));
  }
}
