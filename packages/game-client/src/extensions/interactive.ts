import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { BufferReader } from "@shared/util/buffer-serialization";

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

  public deserialize(data: ClientExtensionSerialized): this {
    this.displayName = data.displayName;
    this.offset.reset(data.offset.x, data.offset.y);
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    this.displayName = reader.readString();
    const offset = reader.readVector2();
    this.offset.reset(offset.x, offset.y);
    PoolManager.getInstance().vector2.release(offset);
    return this;
  }
}
