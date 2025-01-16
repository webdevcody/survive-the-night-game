import { Cooldown } from "@/entities/util/cooldown";
import { Extension, ExtensionSerialized } from "@/extensions/types";
import Destructible from "@/extensions/destructible";
import { IEntity } from "@/entities/types";

export default class Ignitable implements Extension {
  public static readonly type = "ignitable";

  private self: IEntity;
  private cooldown: Cooldown;
  private maxDamage: number;
  private totalDamage: number;
  private damage: number;

  // TODO: this should be configurable for damage / cooldown
  public constructor(self: IEntity, maxDamage = 2) {
    this.self = self;
    this.cooldown = new Cooldown(1);
    this.maxDamage = maxDamage;
    this.totalDamage = 0;
    this.damage = 1;
  }

  public update(deltaTime: number) {
    this.cooldown.update(deltaTime);
    if (this.cooldown.isReady()) {
      this.cooldown.reset();
      this.self.getExt(Destructible).damage(this.damage);
      this.totalDamage += this.damage;

      if (this.totalDamage >= this.maxDamage) {
        this.self.removeExtension(this);
      }
    }
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Ignitable.type,
    };
  }
}
