import { Entity } from "../entity";
import { Extension, ExtensionSerialized } from "./types";

type InteractiveHandler = (entityId: string) => void;

export default class Interactive implements Extension {
  public static readonly type = "interactive";

  private self: Entity;
  private handler: InteractiveHandler | null = null;
  private displayName: string = "";

  public constructor(self: Entity) {
    this.self = self;
  }

  public onInteract(handler: InteractiveHandler): this {
    this.handler = handler;
    return this;
  }

  public setDisplayName(name: string): this {
    this.displayName = name;
    return this;
  }

  public getDisplayName(): string {
    return this.displayName;
  }

  public interact(entityId: string): void {
    this.handler?.(entityId);
  }

  public deserialize(data: ExtensionSerialized): this {
    if (data.displayName) {
      this.displayName = data.displayName;
    }
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Interactive.type,
      displayName: this.displayName,
    };
  }
}
