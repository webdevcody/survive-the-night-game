import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";

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

  public serializeDirty(): ExtensionSerialized | null {
    if (!this.dirty) {
      return null;
    }
    return this.serialize();
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Illuminated.type,
      radius: this.radius,
    };
  }
}

export { Illuminated };
