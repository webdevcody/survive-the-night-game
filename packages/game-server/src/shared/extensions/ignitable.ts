import { ExtensionSerialized } from "./types";
import { Cooldown } from "../entities/util/cooldown";
import Destructible from "./destructible";
import { Extension } from "@shared/types/entity";
import { IEntity } from "../types";

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

  public deserialize(data: ExtensionSerialized): this {
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Ignitable.type,
    };
  }
}
