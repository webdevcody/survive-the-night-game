import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ClientEntity } from "@/entities/client-entity";
import { BufferReader } from "@shared/util/buffer-serialization";

/**
 * Extension that grants infinite stamina (no stamina drain) for a duration
 * Used by energy drink consumable
 */
export class ClientInfiniteRun extends BaseClientExtension {
  public static readonly type = ExtensionTypes.INFINITE_RUN;

  private duration: number = 0;
  private remainingTime: number = 0;

  public constructor(clientEntity: ClientEntity) {
    super(clientEntity);
  }

  public serialize(): ClientExtensionSerialized {
    return {
      type: ClientInfiniteRun.type,
      duration: this.duration,
      remainingTime: this.remainingTime,
    };
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.duration = data.duration ?? 0;
    this.remainingTime = data.remainingTime ?? 0;
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.duration = reader.readFloat64();
    this.remainingTime = reader.readFloat64();
    return this;
  }

  public getRemainingTime(): number {
    return this.remainingTime;
  }

  public isActive(): boolean {
    return this.remainingTime > 0;
  }
}

