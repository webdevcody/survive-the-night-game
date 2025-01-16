import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";

export type Group = "friendly" | "enemy";

export default class Groupable implements Extension {
  public static readonly type = "groupable";

  private self: IEntity;
  private group: Group;

  public constructor(self: IEntity, group: Group) {
    this.self = self;
    this.group = group;
  }

  public getGroup(): Group {
    return this.group;
  }

  public setGroup(group: Group): void {
    this.group = group;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Groupable.type,
      group: this.group,
    };
  }
}
