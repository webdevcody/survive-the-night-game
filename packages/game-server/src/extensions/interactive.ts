import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

type InteractiveHandler = (entityId: number) => void;

export default class Interactive extends ExtensionBase {
  public static readonly type = "interactive";

  private handler: InteractiveHandler | null = null;
  private offset: Vector2;

  public constructor(self: IEntity) {
    super(self, { displayName: "", offset: { x: 0, y: 0 } });
    this.offset = PoolManager.getInstance().vector2.claim(0, 0);
  }

  public onInteract(handler: InteractiveHandler): this {
    this.handler = handler;
    return this;
  }

  public setOffset(offset: Vector2): this {
    this.setVector2Field("offset", this.offset, offset);
    return this;
  }

  public getOffset(): Vector2 {
    return this.offset.clone();
  }

  public setDisplayName(name: string): this {
    const serialized = this.serialized as any;
    serialized.displayName = name;
    return this;
  }

  public getDisplayName(): string {
    const serialized = this.serialized as any;
    return serialized.displayName;
  }

  public interact(entityId: number): void {
    this.handler?.(entityId);
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    const serialized = this.serialized as any;
    writer.writeUInt8(encodeExtensionType(Interactive.type));
    writer.writeString(serialized.displayName);
    writer.writeVector2(this.offset);
  }
}
