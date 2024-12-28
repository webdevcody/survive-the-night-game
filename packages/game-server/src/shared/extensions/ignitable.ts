import { GenericEntity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { Cooldown } from "../entities/util/cooldown";
import Destructible from "./destructible";

export default class Ignitable implements Extension {
  public static readonly Name = ExtensionNames.ignitable;

  private self: GenericEntity;
  private cooldown: Cooldown;

  public constructor(self: GenericEntity) {
    this.self = self;
    this.cooldown = new Cooldown(1);
  }

  public update(deltaTime: number) {
    this.cooldown.update(deltaTime);
    if (this.cooldown.isReady()) {
      this.self.getExt(Destructible).damage(1);
      this.cooldown.reset();
    }
  }

  public deserialize(data: ExtensionSerialized): this {
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Ignitable.Name,
    };
  }
}
