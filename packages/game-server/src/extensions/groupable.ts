import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";

export type Group = "friendly" | "enemy";

export default class Groupable implements Extension {
  public static readonly type = "groupable";

  private self: IEntity;
  private group: Group;
  private dirty: boolean = false;

  public constructor(self: IEntity, group: Group) {
    this.self = self;
    this.group = group;
  }

  public getGroup(): Group {
    return this.group;
  }

  public setGroup(group: Group): void {
    const groupChanged = this.group !== group;
    this.group = group;
    if (groupChanged) {
      this.markDirty();
    }
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
      type: Groupable.type,
      group: this.group,
    };
  }
}
