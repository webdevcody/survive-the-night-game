import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";

export class ClientCarryable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.CARRYABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
