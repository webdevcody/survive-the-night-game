import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";

type InteractiveHandler = (entityId: string) => void;

export default class Interactive implements Extension {
  public static readonly type = "interactive";

  private self: IEntity;
  private handler: InteractiveHandler | null = null;
  private displayName: string = "";

  public constructor(self: IEntity) {
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

  public serialize(): ExtensionSerialized {
    return {
      type: Interactive.type,
      displayName: this.displayName,
    };
  }
}
