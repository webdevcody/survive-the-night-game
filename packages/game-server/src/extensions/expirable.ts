import { Cooldown } from "@/entities/util/cooldown";
import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

// an extension which will automatically remove the entity after a certain amount of time.
export default class Expirable implements Extension {
  public static readonly type = "expirable";

  private self: IEntity;
  private expireCooldown: Cooldown;
  private dirty: boolean = false;

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
    writer.writeUInt8(encodeExtensionType(Expirable.type));
  }
}
