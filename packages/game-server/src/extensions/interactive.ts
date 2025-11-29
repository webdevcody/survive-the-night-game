import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { encodeInteractableText } from "@shared/util/interactable-text-encoding";
import { ExtensionBase } from "./extension-base";

type InteractiveHandler = (entityId: number) => void;

type InteractiveFields = {
  displayName: string;
  offset: { x: number; y: number };
  autoPickupEnabled: boolean;
};

export default class Interactive extends ExtensionBase<InteractiveFields> {
  public static readonly type = "interactive";

  private handler: InteractiveHandler | null = null;
  private offset: Vector2;

  public constructor(self: IEntity) {
    super(self, { displayName: "", offset: { x: 0, y: 0 }, autoPickupEnabled: false });
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
    this.serialized.set('displayName', name);
    return this;
  }

  public getDisplayName(): string {
    return this.serialized.get('displayName');
  }

  public setAutoPickupEnabled(enabled: boolean): this {
    this.serialized.set('autoPickupEnabled', enabled);
    return this;
  }

  public getAutoPickupEnabled(): boolean {
    return this.serialized.get('autoPickupEnabled');
  }

  public interact(entityId: number): void {
    this.handler?.(entityId);
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Interactive.type));
    writer.writeUInt8(encodeInteractableText(this.serialized.get('displayName')));
    writer.writeVector2(this.offset);
    writer.writeBoolean(this.serialized.get('autoPickupEnabled'));
  }
}
