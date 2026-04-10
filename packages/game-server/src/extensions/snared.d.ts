import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
/**
 * Extension that marks an entity as snared/immobilized
 * When present, the entity should not be able to move
 */
type SnaredFields = Record<string, never>;
export default class Snared extends ExtensionBase<SnaredFields> {
    static readonly type = "snared";
    constructor(self: IEntity);
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
