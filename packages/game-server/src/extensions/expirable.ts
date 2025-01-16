import { Cooldown } from "@/entities/util/cooldown";
import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";

// an extension which will automatically remove the entity after a certain amount of time.
export default class Expirable implements Extension {
  public static readonly type = "expirable";

  private self: IEntity;
  private expireCooldown: Cooldown;

  public constructor(self: IEntity, expiresIn: number) {
    this.self = self;
    this.expireCooldown = new Cooldown(expiresIn);
  }

  public update(deltaTime: number) {
    this.expireCooldown.update(deltaTime);

    if (this.expireCooldown.isReady()) {
      this.self.getEntityManager().markEntityForRemoval(this.self);
    }
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Expirable.type,
    };
  }
}
