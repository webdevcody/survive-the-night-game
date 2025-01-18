import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";

export class ClientExpirable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.EXPIRABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
