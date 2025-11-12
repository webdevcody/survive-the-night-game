import { Extension, ExtensionSerialized } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { ExtensionTypes } from "@/util/extension-types";
import Vector2 from "@shared/util/vector2";

export default class Positionable implements Extension {
  public static readonly type = ExtensionTypes.POSITIONABLE;

  private self: IEntity;
  private position: Vector2 = new Vector2(0, 0);
  private size: Vector2 = new Vector2(0, 0);
  private onPositionChange?: (entity: IEntity) => void;
  private dirty: boolean = false;

  public constructor(self: IEntity) {
    this.self = self;
  }

  public setOnPositionChange(callback: (entity: IEntity) => void): this {
    this.onPositionChange = callback;
    return this;
  }

  public getSize(): Vector2 {
    return this.size.clone();
  }

  public setSize(size: Vector2): this {
    const sizeChanged = this.size.x !== size.x || this.size.y !== size.y;
    this.size = size;
    if (sizeChanged) {
      this.markDirty();
    }
    return this;
  }

  public getCenterPosition(): Vector2 {
    return this.size.div(2).add(this.position);
  }

  public getPosition(): Vector2 {
    return this.position.clone();
  }

  public setPosition(position: Vector2): this {
    // Only trigger callback if position actually changed
    const positionChanged = this.position.x !== position.x || this.position.y !== position.y;
    // Clone the position to prevent external mutations from affecting our state
    this.position = position.clone();

    if (positionChanged) {
      if (this.onPositionChange) {
        this.onPositionChange(this.self);
      }
      this.markDirty();
    }

    return this;
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    // Notify entity that this extension is dirty
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
      type: Positionable.type,
      position: this.position,
      size: this.size,
    };
  }
}
