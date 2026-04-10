import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type StaticFields = Record<string, never>;
export default class Static extends ExtensionBase<StaticFields> {
    static readonly type: "static";
    constructor(self: IEntity);
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
