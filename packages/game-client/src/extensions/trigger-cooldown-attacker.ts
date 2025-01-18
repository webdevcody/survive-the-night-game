import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";

export class ClientTriggerCooldownAttacker extends BaseClientExtension {
  public static readonly type = ExtensionTypes.TRIGGER_COOLDOWN_ATTACKER;
  public isReady: boolean = true;

  public deserialize(data: ClientExtensionSerialized): this {
    this.isReady = data.isReady ?? true;
    return this;
  }
}
