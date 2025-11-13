import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";

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

  public serialize(): ExtensionSerialized {
    return {
      type: Updatable.type,
    };
  }
}
