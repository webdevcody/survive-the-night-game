import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import Destructible from "./destructible";
import { Cooldown } from "@/entities/util/cooldown";

/**
 * Extension that applies poison damage over time to an entity
 * Similar to Ignitable but for poison effects
 */
type PoisonFields = {
  maxDamage: number;
  totalDamage: number;
};

export default class Poison extends ExtensionBase<PoisonFields> {
  public static readonly type = "poison";

  private cooldown: Cooldown;
  private damage: number;
  private damageInterval: number;

  public constructor(
    self: IEntity,
    maxDamage: number = 3,
    damagePerTick: number = 1,
    damageInterval: number = 1
  ) {
    super(self, { maxDamage, totalDamage: 0 });
    this.cooldown = new Cooldown(damageInterval);
    this.damage = damagePerTick;
    this.damageInterval = damageInterval;
  }

  public update(deltaTime: number) {
    this.cooldown.update(deltaTime);
    if (this.cooldown.isReady()) {
      this.cooldown.reset();
      if (this.self.hasExt(Destructible)) {
        this.self.getExt(Destructible).damage(this.damage);
        const currentTotalDamage = this.serialized.get("totalDamage");
        this.serialized.set("totalDamage", currentTotalDamage + this.damage);

        const maxDamage = this.serialized.get("maxDamage");
        if (currentTotalDamage + this.damage >= maxDamage) {
          this.self.removeExtension(this);
        }
      }
    }
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Poison.type));
    writer.writeFloat64(this.serialized.get("maxDamage"));
    writer.writeFloat64(this.serialized.get("totalDamage"));
  }
}

