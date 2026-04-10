import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type ConsumableHandler = (entityId: number, idx: number) => void;
type ConsumableFields = Record<string, never>;
export default class Consumable extends ExtensionBase<ConsumableFields> {
    static readonly type = "consumable";
    private handler;
    constructor(self: IEntity);
    onConsume(handler: ConsumableHandler): this;
    consume(entityId: number, idx: number): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
