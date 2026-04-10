import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type EntityFactory = (type: EntityType) => IEntity;
type CombustibleFields = {
    numFires: number;
    spreadRadius: number;
};
export default class Combustible extends ExtensionBase<CombustibleFields> {
    static readonly type = "combustible";
    private entityFactory;
    constructor(self: IEntity, entityFactory: EntityFactory, numFires?: number, spreadRadius?: number);
    onDeath(): void;
    private getRandomPositionInRadius;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
