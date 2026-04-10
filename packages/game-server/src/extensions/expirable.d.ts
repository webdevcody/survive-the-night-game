import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type ExpirableFields = {
    expiresIn: number;
};
export default class Expirable extends ExtensionBase<ExpirableFields> {
    static readonly type = "expirable";
    private expireCooldown;
    constructor(self: IEntity, expiresIn: number);
    update(deltaTime: number): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
