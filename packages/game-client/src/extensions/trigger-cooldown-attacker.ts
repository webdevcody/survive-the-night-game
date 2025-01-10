import { ExtensionTypes } from "@survive-the-night/game-server/src/shared/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export class ClientTriggerCooldownAttacker implements ClientExtension {
  public static readonly type = ExtensionTypes.TRIGGER_COOLDOWN_ATTACKER;
  public isReady: boolean = true;

  public deserialize(data: ClientExtensionSerialized): this {
    this.isReady = data.isReady ?? true;
    return this;
  }
}
