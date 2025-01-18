import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";

export type Group = "friendly" | "enemy";

export class ClientGroupable extends BaseClientExtension {
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
