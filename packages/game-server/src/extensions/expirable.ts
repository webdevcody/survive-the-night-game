import { Cooldown } from "@/entities/util/cooldown";
import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { BufferWriter, MonitoredBufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

// an extension which will automatically remove the entity after a certain amount of time.
export default class Expirable extends ExtensionBase {
  public static readonly type = "expirable";

  private expireCooldown: Cooldown;

  public constructor(self: IEntity, expiresIn: number) {
    super(self, { expiresIn });
    this.expireCooldown = new Cooldown(expiresIn);
  }

  public update(deltaTime: number) {
    this.expireCooldown.update(deltaTime);

    if (this.expireCooldown.isReady()) {
      this.self.getEntityManager().markEntityForRemoval(this.self);
    }
  }

  public serializeToBuffer(writer: BufferWriter | MonitoredBufferWriter, onlyDirty: boolean = false): void {
    if (writer instanceof MonitoredBufferWriter || (writer as any).constructor?.name === 'MonitoredBufferWriter') {
      (writer as MonitoredBufferWriter).writeUInt8(encodeExtensionType(Expirable.type), "ExtensionType");
    } else {
      writer.writeUInt8(encodeExtensionType(Expirable.type));
    }
  }
}
