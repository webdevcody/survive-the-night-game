import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type UpdateFunction = (deltaTime: number) => void;
type UpdatableFields = Record<string, never>;
export default class Updatable extends ExtensionBase<UpdatableFields> {
    static readonly type = "updatable";
    private updateFunction;
    /**
     * will create a trigger box around an entity which should be used for various purposes.
     */
    constructor(self: IEntity, updateFunction: UpdateFunction);
    setUpdateFunction(cb: UpdateFunction): this;
    update(deltaTime: number): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
