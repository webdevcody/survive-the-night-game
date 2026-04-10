import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type IgnitableFields = {
    maxDamage: number;
    totalDamage: number;
};
export default class Ignitable extends ExtensionBase<IgnitableFields> {
    static readonly type = "ignitable";
    private cooldown;
    private damage;
    constructor(self: IEntity, maxDamage?: number);
    update(deltaTime: number): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
