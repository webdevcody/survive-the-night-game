import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ItemState } from "@shared/types/entity";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientCarryable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.CARRYABLE;
  private state: any = {};
  private itemState: ItemState = {};
  private itemKey: string = "";

  public deserialize(data: ClientExtensionSerialized): this {
    this.state = data.state;
    this.itemState = data.itemState;
    this.itemKey = data.itemKey;
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    // Read field count (always present now)
    const fieldCount = reader.readUInt8();
    
    // Read fields by index
    for (let i = 0; i < fieldCount; i++) {
      const fieldIndex = reader.readUInt8();
      // Field indices: itemType = 0, state = 1
      if (fieldIndex === 0) {
        const itemType = reader.readString();
        this.itemKey = itemType; // Use itemType as itemKey
      } else if (fieldIndex === 1) {
        // Read ItemState record (values are numbers)
        this.itemState = reader.readRecord(() => reader.readFloat64());
        this.state = this.itemState; // For compatibility
      }
    }
    return this;
  }

  public getState(): any {
    return this.state;
  }

  public getItemState(): ItemState {
    return this.itemState;
  }

  public getItemKey(): string {
    return this.itemKey;
  }
}
