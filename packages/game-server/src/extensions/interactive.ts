import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

type InteractiveHandler = (entityId: number) => void;

export default class Interactive implements Extension {
  public static readonly type = "interactive";

  private self: IEntity;
  private handler: InteractiveHandler | null = null;
  private displayName: string = "";
  private offset: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private dirty: boolean = false;

  public constructor(self: IEntity) {
    this.self = self;
  }

  public onInteract(handler: InteractiveHandler): this {
    this.handler = handler;
    return this;
  }

  public setOffset(offset: Vector2): this {
    const offsetChanged = this.offset.x !== offset.x || this.offset.y !== offset.y;
    this.offset.reset(offset.x, offset.y);
    if (offsetChanged) {
      this.markDirty();
    }
    return this;
  }

  public getOffset(): Vector2 {
    return this.offset.clone();
  }

  public setDisplayName(name: string): this {
    const nameChanged = this.displayName !== name;
    this.displayName = name;
    if (nameChanged) {
      this.markDirty();
    }
    return this;
  }

  public getDisplayName(): string {
    return this.displayName;
  }

  public interact(entityId: number): void {
    this.handler?.(entityId);
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
    writer.writeUInt32(encodeExtensionType(Interactive.type));
    writer.writeString(this.displayName);
    writer.writeVector2(this.offset);
  }
}
