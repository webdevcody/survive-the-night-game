import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "@/extensions/types";

export class ClientTriggerCooldownAttacker implements ClientExtension {
  public static readonly type = ExtensionTypes.TRIGGER_COOLDOWN_ATTACKER;
  public isReady: boolean = true;

  public deserialize(data: ClientExtensionSerialized): this {
    this.isReady = data.isReady ?? true;
    return this;
  }
}
