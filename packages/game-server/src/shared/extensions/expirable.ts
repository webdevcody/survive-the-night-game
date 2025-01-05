import { Entity } from "../entities";
import { Extension, ExtensionSerialized } from "./types";
import { Cooldown } from "../entities/util/cooldown";

// an extension which will automatically remove the entity after a certain amount of time.
export default class Expirable implements Extension {
  public static readonly type = "expirable";

  private self: Entity;
  private expireCooldown: Cooldown;

  public constructor(self: Entity, expiresIn: number) {
    this.self = self;
    this.expireCooldown = new Cooldown(expiresIn);
  }

  public update(deltaTime: number) {
    this.expireCooldown.update(deltaTime);

    if (this.expireCooldown.isReady()) {
      this.self.getEntityManager().markEntityForRemoval(this.self);
    }
  }

  public deserialize(data: ExtensionSerialized) {
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Expirable.type,
    };
  }
}
