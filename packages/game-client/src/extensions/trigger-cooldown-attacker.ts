import { ExtensionTypes } from "@survive-the-night/game-server/src/shared/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export class ClientTriggerCooldownAttacker implements ClientExtension {
  public static readonly type = ExtensionTypes.TRIGGER_COOLDOWN_ATTACKER;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
