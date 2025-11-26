import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

/**
 * Placeable extension marks entities that are structures placed on the ground
 * (walls, spikes, mines, bear traps, etc.) as opposed to dropped items.
 *
 * This is used to determine if an item requires holding F to pick up.
 * Placeable items require holding F, while regular droppable items are instant.
 *
 * Also tracks the ownerId of who placed the structure (used for friendly fire in Battle Royale).
 */
type PlaceableFields = {
  ownerId: number | null;
};

export default class Placeable extends ExtensionBase<PlaceableFields> {
  public static readonly type = "placeable" as const;

  public constructor(self: IEntity) {
    super(self, { ownerId: null });
  }

  /**
   * Set the owner (player who placed this structure)
   */
  public setOwnerId(ownerId: number): this {
    this.serialized.set("ownerId", ownerId);
    return this;
  }

  /**
   * Get the owner ID (player who placed this structure)
   */
  public getOwnerId(): number | null {
    return this.serialized.get("ownerId");
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Placeable.type));
  }
}
