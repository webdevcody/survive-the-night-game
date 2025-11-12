import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";
import Vector2 from "@/util/vector2";

type InteractiveHandler = (entityId: string) => void;

export default class Interactive implements Extension {
  public static readonly type = "interactive";

  private self: IEntity;
  private handler: InteractiveHandler | null = null;
  private displayName: string = "";
  private offset: Vector2 = new Vector2(0, 0);
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
    this.offset = offset;
    if (offsetChanged) {
      this.markDirty();
    }
    return this;
  }

  public getOffset(): Vector2 {
    return this.offset;
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

  public interact(entityId: string): void {
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

  public serializeDirty(): ExtensionSerialized | null {
    if (!this.dirty) {
      return null;
    }
    return this.serialize();
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Interactive.type,
      displayName: this.displayName,
      offset: this.offset,
    };
  }
}
