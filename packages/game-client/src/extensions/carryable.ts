import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ItemState } from "@shared/types/entity";
import { BufferReader } from "@shared/util/buffer-serialization";
import { itemTypeRegistry } from "@shared/util/item-type-encoding";
import { readItemState } from "@shared/util/item-state-serialization";

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
    const itemType = itemTypeRegistry.decode(reader.readUInt8());
    this.itemKey = itemType; // Use itemType as itemKey
    // Read ItemState using optimized format
    this.itemState = readItemState(reader);
    this.state = this.itemState; // For compatibility
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
