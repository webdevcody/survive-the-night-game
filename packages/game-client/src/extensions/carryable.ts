import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "@/extensions/types";

export class ClientCarryable implements ClientExtension {
  public static readonly type = ExtensionTypes.CARRYABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
