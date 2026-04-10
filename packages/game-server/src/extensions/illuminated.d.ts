import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type IlluminatedFields = {
    radius: number;
};
export default class Illuminated extends ExtensionBase<IlluminatedFields> {
    static readonly type = "illuminated";
    constructor(self: IEntity, radius?: number);
    getRadius(): number;
    setRadius(radius: number): this;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export { Illuminated };
