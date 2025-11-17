import { Cooldown } from "@/entities/util/cooldown";
import { Extension } from "@/extensions/types";
import Destructible from "@/extensions/destructible";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

export default class Ignitable extends ExtensionBase {
  public static readonly type = "ignitable";

  private cooldown: Cooldown;
  private damage: number;

  // TODO: this should be configurable for damage / cooldown
  public constructor(self: IEntity, maxDamage = 2) {
    super(self, { maxDamage, totalDamage: 0 });
    this.cooldown = new Cooldown(1);
    this.damage = 1;
  }

  public update(deltaTime: number) {
    const serialized = this.serialized as any;
    this.cooldown.update(deltaTime);
    if (this.cooldown.isReady()) {
      this.cooldown.reset();
      this.self.getExt(Destructible).damage(this.damage);
      serialized.totalDamage += this.damage;

      if (serialized.totalDamage >= serialized.maxDamage) {
        this.self.removeExtension(this);
      }
    }
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Ignitable.type));
    // Ignitable extension has no serialized fields, so always write 0 field count
    writer.writeUInt8(0);
  }
}
