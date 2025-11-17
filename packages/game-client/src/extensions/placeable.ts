import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ExtensionTypes } from "@shared/util/extension-types";
import { BufferReader } from "@shared/util/buffer-serialization";

/**
 * ClientPlaceable extension marks entities that are structures placed on the ground
 * (walls, spikes, mines, bear traps, etc.) as opposed to dropped items.
 *
 * This is used to determine if an item requires holding F to pick up.
 * Placeable items require holding F, while regular droppable items are instant.
 */
export class ClientPlaceable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.PLACEABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    // Read field count (always present now, should be 0 for Placeable extension)
    const fieldCount = reader.readUInt8();
    // Placeable extension has no fields, so nothing to read
    return this;
  }
}
