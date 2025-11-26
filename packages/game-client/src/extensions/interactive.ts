import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { BufferReader } from "@shared/util/buffer-serialization";
import { decodeInteractableText } from "@shared/util/interactable-text-encoding";

export class ClientInteractive extends BaseClientExtension {
  public static readonly type = ExtensionTypes.INTERACTIVE;

  private displayName = "";
  private offset: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);

  public getDisplayName(): string {
    return this.displayName;
  }

  public getOffset(): Vector2 {
    return this.offset.clone();
  }

  public setOffset(offset: Vector2): this {
    this.offset.reset(offset.x, offset.y);
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.displayName = decodeInteractableText(reader.readUInt8());
    const offset = reader.readVector2();
    this.offset.reset(offset.x, offset.y);
    PoolManager.getInstance().vector2.release(offset);
    return this;
  }
}
