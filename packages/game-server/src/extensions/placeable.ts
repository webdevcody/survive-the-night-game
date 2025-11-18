import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { BufferWriter, MonitoredBufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

/**
 * Placeable extension marks entities that are structures placed on the ground
 * (walls, spikes, mines, bear traps, etc.) as opposed to dropped items.
 *
 * This is used to determine if an item requires holding F to pick up.
 * Placeable items require holding F, while regular droppable items are instant.
 */
export default class Placeable extends ExtensionBase {
  public static readonly type = "placeable" as const;

  public constructor(self: IEntity) {
    super(self, {});
  }

  public serializeToBuffer(writer: BufferWriter | MonitoredBufferWriter, onlyDirty: boolean = false): void {
    if (writer instanceof MonitoredBufferWriter || (writer as any).constructor?.name === 'MonitoredBufferWriter') {
      (writer as MonitoredBufferWriter).writeUInt8(encodeExtensionType(Placeable.type), "ExtensionType");
    } else {
      writer.writeUInt8(encodeExtensionType(Placeable.type));
    }
  }
}
