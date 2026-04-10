import { IEntity } from "@/entities/types";
import Vector2 from "@shared/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type PositionableFields = {
    position: {
        x: number;
        y: number;
    };
    size: {
        x: number;
        y: number;
    };
};
export default class Positionable extends ExtensionBase<PositionableFields> {
    static readonly type: "positionable";
    private position;
    private size;
    private centerPosition;
    private onPositionChange?;
    constructor(self: IEntity);
    setOnPositionChange(callback: (entity: IEntity) => void): this;
    getSize(): Vector2;
    setSize(size: Vector2): this;
    getCenterPosition(): Vector2;
    getPosition(): Vector2;
    setPosition(position: Vector2): this;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
