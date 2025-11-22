import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ClientEntity } from "@/entities/client-entity";
import { BufferReader } from "@shared/util/buffer-serialization";

/**
 * Client-side counterpart for AcidTrigger extension.
 * Currently just holds the ready state, but logic is server-side.
 */
export class ClientAcidTrigger extends BaseClientExtension {
  public static readonly type = ExtensionTypes.ACID_TRIGGER;

  private isReady: boolean = false;

  public constructor(clientEntity: ClientEntity) {
    super(clientEntity);
  }

  public serialize(): ClientExtensionSerialized {
    return {
      type: ClientAcidTrigger.type,
      isReady: this.isReady,
    };
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.isReady = data.isReady ?? false;
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.isReady = reader.readBoolean();
    return this;
  }
}

