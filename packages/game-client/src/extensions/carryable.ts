import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ItemState } from "@shared/types/entity";

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
