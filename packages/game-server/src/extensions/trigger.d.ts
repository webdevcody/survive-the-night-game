import { EntityType } from "@/types/entity";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type TriggerableFields = {
    size: {
        x: number;
        y: number;
    };
    filter: EntityType[];
};
export default class Triggerable extends ExtensionBase<TriggerableFields> {
    static readonly type: "triggerable";
    private size;
    private onEntityEntered?;
    private filter;
    /**
     * will create a trigger box around an entity which should be used for various purposes.
     */
    constructor(self: IEntity, size: Vector2, filter: EntityType[]);
    setOnEntityEntered(cb: (entity: IEntity) => void): this;
    update(deltaTime: number): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
