import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientDestructible extends BaseClientExtension {
  public static readonly type = ExtensionTypes.DESTRUCTIBLE;

  private health = 0;
  private maxHealth = 0;

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public isDead(): boolean {
    return this.health === 0;
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.health = data.health;
    this.maxHealth = data.maxHealth;
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    // Read field count (always present now)
    const fieldCount = reader.readUInt8();
    
    // Read fields by index
    for (let i = 0; i < fieldCount; i++) {
      const fieldIndex = reader.readUInt8();
      // Field indices: health = 0, maxHealth = 1
      if (fieldIndex === 0) {
        this.health = reader.readFloat64();
      } else if (fieldIndex === 1) {
        this.maxHealth = reader.readFloat64();
      }
    }
    return this;
  }
}
