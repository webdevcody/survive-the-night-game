import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ClientEntity } from "@/entities/client-entity";
import { BufferReader } from "@shared/util/buffer-serialization";

/**
 * Client extension for toxic gas cloud
 */
export class ClientToxicGasCloudExtension extends BaseClientExtension {
  public static readonly type = ExtensionTypes.TOXIC_GAS_CLOUD;

  public age: number = 0; // Made public for rendering access
  private canReproduce: boolean = true;
  private primaryDirectionX: number = 0;
  private primaryDirectionY: number = 0;
  private isOriginalCloud: boolean = true;

  public constructor(clientEntity: ClientEntity) {
    super(clientEntity);
  }

  public serialize(): ClientExtensionSerialized {
    return {
      type: ClientToxicGasCloudExtension.type,
      age: this.age,
      canReproduce: this.canReproduce,
      primaryDirectionX: this.primaryDirectionX,
      primaryDirectionY: this.primaryDirectionY,
      isOriginalCloud: this.isOriginalCloud,
    };
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.age = data.age ?? 0;
    this.canReproduce = data.canReproduce ?? true;
    this.primaryDirectionX = data.primaryDirectionX ?? 0;
    this.primaryDirectionY = data.primaryDirectionY ?? 0;
    this.isOriginalCloud = data.isOriginalCloud ?? true;
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.age = reader.readFloat64();
    this.canReproduce = reader.readBoolean();
    this.primaryDirectionX = reader.readFloat64();
    this.primaryDirectionY = reader.readFloat64();
    this.isOriginalCloud = reader.readBoolean();
    return this;
  }
}
