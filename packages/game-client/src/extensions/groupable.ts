import { ExtensionTypes } from "@shared/geom/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export type Group = "friendly" | "enemy";

export class ClientGroupable implements ClientExtension {
  public static readonly type = ExtensionTypes.GROUPABLE;

  private group: Group = "friendly";

  public getGroup(): Group {
    return this.group;
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.group = data.group;
    return this;
  }
}
