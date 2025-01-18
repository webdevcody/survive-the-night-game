import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";

export class ClientInteractive extends BaseClientExtension {
  public static readonly type = ExtensionTypes.INTERACTIVE;

  private displayName = "";

  public getDisplayName(): string {
    return this.displayName;
  }

  public deserialize(data: ClientExtensionSerialized): this {
    if (data.displayName) {
      this.displayName = data.displayName;
    }
    return this;
  }
}
