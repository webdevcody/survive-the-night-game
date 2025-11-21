import { Cooldown } from "@/entities/util/cooldown";
import { Extension } from "@/extensions/types";
import Destructible from "@/extensions/destructible";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

type IgnitableFields = {
  maxDamage: number;
  totalDamage: number;
};

export default class Ignitable extends ExtensionBase<IgnitableFields> {
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
    this.cooldown.update(deltaTime);
    if (this.cooldown.isReady()) {
      this.cooldown.reset();
      this.self.getExt(Destructible).damage(this.damage);
      const currentTotalDamage = this.serialized.get('totalDamage');
      this.serialized.set('totalDamage', currentTotalDamage + this.damage);

      const maxDamage = this.serialized.get('maxDamage');
      if (currentTotalDamage + this.damage >= maxDamage) {
        this.self.removeExtension(this);
      }
    }
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Ignitable.type));
  }
}
