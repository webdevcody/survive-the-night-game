import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { ClientEntity } from "@/entities/client-entity";
import { BufferReader } from "@shared/util/buffer-serialization";

/**
 * Client extension for toxic gas cloud
 */
export class ClientToxicGasCloudExtension extends BaseClientExtension {
  public static readonly type = ExtensionTypes.TOXIC_GAS_CLOUD;

  public age: number = 0; // Made public for rendering access
  public permanent: boolean = false; // Made public for rendering access
  private canReproduce: boolean = true;
  private primaryDirectionX: number = 0;
  private primaryDirectionY: number = 0;
  private isOriginalCloud: boolean = true;

  public constructor(clientEntity: ClientEntity) {
    super(clientEntity);
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.age = reader.readFloat64();
    this.canReproduce = reader.readBoolean();
    this.primaryDirectionX = reader.readFloat64();
    this.primaryDirectionY = reader.readFloat64();
    this.isOriginalCloud = reader.readBoolean();
    this.permanent = reader.readBoolean();
    return this;
  }
}
