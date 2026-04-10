import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type MovableFields = {
    velocity: {
        x: number;
        y: number;
    };
};
export default class Movable extends ExtensionBase<MovableFields> {
    static readonly type = "movable";
    private velocity;
    private hasFriction;
    constructor(self: IEntity);
    getVelocity(): Vector2;
    setVelocity(velocity: Vector2): void;
    setHasFriction(hasFriction: boolean): this;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
    update(deltaTime: number): void;
}
export {};
