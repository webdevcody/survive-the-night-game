import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { ClientEntity } from "@/entities/client-entity";
import { BufferReader } from "@shared/util/buffer-serialization";

/**
 * Extension that marks an entity as snared/immobilized
 * When present, the entity should not be able to move
 */
export class ClientSnared extends BaseClientExtension {
  public static readonly type = ExtensionTypes.SNARED;

  public constructor(clientEntity: ClientEntity) {
    super(clientEntity);
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Snared extension has no fields
    return this;
  }
}
