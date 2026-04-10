import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { Group } from "@shared/util/group-encoding";
import { ExtensionBase } from "./extension-base";
type GroupableFields = {
    group: Group;
};
export default class Groupable extends ExtensionBase<GroupableFields> {
    static readonly type = "groupable";
    constructor(self: IEntity, group: Group);
    getGroup(): Group;
    setGroup(group: Group): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
