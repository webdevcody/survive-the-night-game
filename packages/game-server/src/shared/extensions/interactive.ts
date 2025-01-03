import { GenericEntity } from "../entities";
import { Player } from "../entities/player";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";

type InteractiveHandler = (player: Player) => void;

export default class Interactive implements Extension {
  public static readonly Name = ExtensionNames.interactive;

  private self: GenericEntity;
  private handler: InteractiveHandler | null = null;
  private displayName: string = "";

  public constructor(self: GenericEntity) {
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

  public interact(player: Player): void {
    this.handler?.(player);
  }

  public deserialize(data: ExtensionSerialized): this {
    if (data.displayName) {
      this.displayName = data.displayName;
    }
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Interactive.Name,
      displayName: this.displayName,
    };
  }
}
