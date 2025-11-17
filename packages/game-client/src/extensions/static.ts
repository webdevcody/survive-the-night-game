import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ClientEntity } from "@/entities/client-entity";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientStatic extends BaseClientExtension {
  public static readonly type = ExtensionTypes.STATIC;

  public constructor(clientEntity: ClientEntity) {
    super(clientEntity);
  }

  public serialize(): ClientExtensionSerialized {
    return {
      type: ClientStatic.type,
    };
  }

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    // Read field count (always present now, should be 0 for Static extension)
    const fieldCount = reader.readUInt8();
    // Static extension has no fields, so nothing to read
    return this;
  }
}
