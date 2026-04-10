import { IEntity } from "@/entities/types";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type CollidableFields = {
    size: {
        x: number;
        y: number;
    };
    offset: {
        x: number;
        y: number;
    };
    enabled: boolean;
};
export default class Collidable extends ExtensionBase<CollidableFields> {
    static readonly type = "collidable";
    private size;
    private offset;
    private readonly hitBox;
    constructor(self: IEntity);
    setEnabled(enabled: boolean): this;
    isEnabled(): boolean;
    setSize(size: Vector2): this;
    getSize(): Vector2;
    setOffset(offset: Vector2): this;
    getHitBox(): Rectangle;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
