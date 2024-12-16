import { GenericEntity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { Player } from "../entities/player";

type ConsumableHandler = (player: Player, idx: number) => void;

export default class Consumable implements Extension {
  public static readonly Name = ExtensionNames.consumable;

  private self: GenericEntity;
  private handler: ConsumableHandler | null = null;

  public constructor(self: GenericEntity) {
    this.self = self;
  }

  public onConsume(handler: ConsumableHandler): this {
    this.handler = handler;
    return this;
  }

  public consume(player: Player, idx: number): void {
    this.handler?.(player, idx);
  }

  public deserialize(data: ExtensionSerialized): this {
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Consumable.Name,
    };
  }
}
