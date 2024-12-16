import { GenericEntity } from "../entities";
import { Player } from "../entities/player";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";

type InteractiveHandler = (player: Player) => void;

export default class Interactive implements Extension {
  public static readonly Name = ExtensionNames.interactive;

  private self: GenericEntity;
  private handler: InteractiveHandler | null = null;

  public constructor(self: GenericEntity) {
    this.self = self;
  }

  public onInteract(handler: InteractiveHandler): this {
    this.handler = handler;
    return this;
  }

  public interact(player: Player): void {
    this.handler?.(player);
  }

  public deserialize(data: ExtensionSerialized): this {
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Interactive.Name,
    };
  }
}
