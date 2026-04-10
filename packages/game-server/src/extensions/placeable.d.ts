import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
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
    static readonly type: "placeable";
    constructor(self: IEntity);
    /**
     * Set the owner (player who placed this structure)
     */
    setOwnerId(ownerId: number): this;
    /**
     * Get the owner ID (player who placed this structure)
     */
    getOwnerId(): number | null;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
