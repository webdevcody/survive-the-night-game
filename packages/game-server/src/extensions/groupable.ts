import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { encodeGroup, Group } from "@shared/util/group-encoding";
import { ExtensionBase } from "./extension-base";

type GroupableFields = {
  group: Group;
};

export default class Groupable extends ExtensionBase<GroupableFields> {
  public static readonly type = "groupable";

  constructor(self: IEntity, group: Group) {
    super(self, { group });
  }

  public getGroup(): Group {
    return this.serialized.get("group");
  }

  public setGroup(group: Group): void {
    this.serialized.set("group", group);
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Groupable.type));
    writer.writeUInt8(encodeGroup(this.serialized.get("group")));
  }
}
