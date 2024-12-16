import { GenericEntity } from "../entities";
import { Player } from "../entities/player";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";

interface InteractiveOptions {
  eventName?: string;
}

export default class Interactive implements Extension {
  public static readonly Name = ExtensionNames.interactive;

  private self: GenericEntity;
  private eventName: string | null = null;

  public constructor(self: GenericEntity) {
    this.self = self;
  }

  public init(options: InteractiveOptions): this {
    if (options.eventName !== undefined) {
      this.eventName = options.eventName;
    }
    return this;
  }

  public interact(player: Player): void {
    if (this.eventName !== null) {
      this.self.dispatchEvent(
        new CustomEvent(this.eventName, {
          detail: player,
        })
      );
    }
  }

  public deserialize(data: ExtensionSerialized): this {
    this.eventName = data.eventName;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Interactive.Name,
      eventName: this.eventName,
    };
  }
}
