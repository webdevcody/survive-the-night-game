import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import { Cooldown } from "@/entities/util/cooldown";

/**
 * Extension that grants infinite stamina (no stamina drain) for a duration
 * Used by energy drink consumable
 */
type InfiniteRunFields = {
  duration: number;
};

export default class InfiniteRun extends ExtensionBase<InfiniteRunFields> {
  public static readonly type = "infinite-run";

  private cooldown: Cooldown;

  public constructor(self: IEntity, duration: number) {
    super(self, { duration });
    this.cooldown = new Cooldown(duration);
  }

  public update(deltaTime: number): void {
    this.cooldown.update(deltaTime);

    if (this.cooldown.isReady()) {
      // Remove extension when duration expires
      this.self.removeExtension(this);
    }
  }

  public getRemainingTime(): number {
    return this.cooldown.getRemainingTime();
  }

  public isActive(): boolean {
    return !this.cooldown.isReady();
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(InfiniteRun.type));
    writer.writeFloat64(this.serialized.get("duration"));
    writer.writeFloat64(this.getRemainingTime());
  }
}

