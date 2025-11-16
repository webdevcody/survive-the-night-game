import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

type ConsumableHandler = (entityId: string, idx: number) => void;

export default class Consumable implements Extension {
  public static readonly type = "consumable";

  private self: IEntity;
  private handler: ConsumableHandler | null = null;
  private dirty: boolean = false;

  public constructor(self: IEntity) {
    this.self = self;
  }

  public onConsume(handler: ConsumableHandler): this {
    this.handler = handler;
    return this;
  }

  public consume(entityId: string, idx: number): void {
    this.handler?.(entityId, idx);
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
    writer.writeUInt32(encodeExtensionType(Consumable.type));
  }
}
