import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { ClientEntity } from "@/entities/client-entity";
import { BufferReader } from "@shared/util/buffer-serialization";

/**
 * Client extension for toxic biome zone
 */
export class ClientToxicBiomeZoneExtension extends BaseClientExtension {
  public static readonly type = ExtensionTypes.TOXIC_BIOME_ZONE;

  public age: number = 0; // Made public for rendering access

  public constructor(clientEntity: ClientEntity) {
    super(clientEntity);
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.age = reader.readFloat64();
    return this;
  }
}
