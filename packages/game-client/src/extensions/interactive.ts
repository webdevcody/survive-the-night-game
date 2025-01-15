import { ExtensionTypes } from "@shared/geom/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export class ClientInteractive implements ClientExtension {
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
