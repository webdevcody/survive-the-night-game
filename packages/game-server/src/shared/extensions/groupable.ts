import { Entity } from "../entity";
import { Extension, ExtensionSerialized } from "./types";

export type Group = "friendly" | "enemy";

export default class Groupable implements Extension {
  public static readonly type = "groupable";

  private self: Entity;
  private group: Group;

  public constructor(self: Entity, group: Group) {
    this.self = self;
    this.group = group;
  }

  public getGroup(): Group {
    return this.group;
  }

  public setGroup(group: Group): void {
    this.group = group;
  }

  public deserialize(data: ExtensionSerialized): this {
    this.group = data.group;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Groupable.type,
      group: this.group,
    };
  }
}
