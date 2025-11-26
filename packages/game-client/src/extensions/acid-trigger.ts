import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
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

  public deserializeFromBuffer(reader: BufferReader): this {
    this.isReady = reader.readBoolean();
    return this;
  }
}

