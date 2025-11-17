import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

type UpdateFunction = (deltaTime: number) => void;

export class ClientUpdatable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.UPDATABLE;

  private updateFunction: UpdateFunction = () => {};

  public setUpdateFunction(cb: UpdateFunction): this {
    this.updateFunction = cb;
    return this;
  }

  public update(deltaTime: number): void {
    this.updateFunction(deltaTime);
  }

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    // Read field count (always present now, should be 0 for Updatable extension)
    const fieldCount = reader.readUInt8();
    // Updatable extension has no fields, so nothing to read
    return this;
  }
}
