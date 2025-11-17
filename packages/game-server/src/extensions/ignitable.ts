import { Cooldown } from "@/entities/util/cooldown";
import { Extension } from "@/extensions/types";
import Destructible from "@/extensions/destructible";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

export default class Ignitable implements Extension {
  public static readonly type = "ignitable";

  private self: IEntity;
  private cooldown: Cooldown;
  private maxDamage: number;
  private totalDamage: number;
  private damage: number;
  private dirty: boolean = false;

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

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public serializeToBuffer(writer: BufferWriter): void {
    writer.writeUInt8(encodeExtensionType(Ignitable.type));
  }
}
