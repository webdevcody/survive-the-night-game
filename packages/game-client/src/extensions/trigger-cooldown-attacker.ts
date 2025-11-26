import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientTriggerCooldownAttacker extends BaseClientExtension {
  public static readonly type = ExtensionTypes.TRIGGER_COOLDOWN_ATTACKER;
  public isReady: boolean = true;

  public deserializeFromBuffer(reader: BufferReader): this {
    this.isReady = reader.readBoolean();
    return this;
  }
}
