import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionTypes } from "@shared/util/extension-types";
import { ExtensionBase } from "./extension-base";

type HoldInteractFields = {
  holdDurationMs: number;
};

/** Marks entities that require holding interact for `holdDurationMs` (client radial). */
export default class HoldInteract extends ExtensionBase<HoldInteractFields> {
  public static readonly type = ExtensionTypes.HOLD_INTERACT;

  public constructor(self: IEntity, holdDurationMs: number) {
    const ms = Math.max(0, Math.min(65535, Math.floor(holdDurationMs)));
    super(self, { holdDurationMs: ms });
  }

  public getHoldDurationMs(): number {
    return this.serialized.get("holdDurationMs");
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(HoldInteract.type));
    writer.writeUInt16(this.serialized.get("holdDurationMs"));
  }
}
