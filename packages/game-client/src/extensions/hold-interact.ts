import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientHoldInteract extends BaseClientExtension {
  public static readonly type = ExtensionTypes.HOLD_INTERACT;

  private holdDurationMs = 0;

  public getHoldDurationMs(): number {
    return this.holdDurationMs;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.holdDurationMs = reader.readUInt16();
    return this;
  }
}
