import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ClientEntity } from "@/entities/client-entity";
import { BufferReader } from "@shared/util/buffer-serialization";

/**
 * Extension that applies poison damage over time to an entity
 */
export class ClientPoison extends BaseClientExtension {
  public static readonly type = ExtensionTypes.POISON;

  private maxDamage: number = 0;
  private totalDamage: number = 0;

  public constructor(clientEntity: ClientEntity) {
    super(clientEntity);
  }

  public serialize(): ClientExtensionSerialized {
    return {
      type: ClientPoison.type,
      maxDamage: this.maxDamage,
      totalDamage: this.totalDamage,
    };
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.maxDamage = data.maxDamage ?? 0;
    this.totalDamage = data.totalDamage ?? 0;
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.maxDamage = reader.readFloat64();
    this.totalDamage = reader.readFloat64();
    return this;
  }
}

