import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";
import { decodeGroup, Group } from "@shared/util/group-encoding";

export class ClientGroupable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.GROUPABLE;

  private group: Group = "friendly";

  public getGroup(): Group {
    return this.group;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.group = decodeGroup(reader.readUInt8());
    return this;
  }
}
