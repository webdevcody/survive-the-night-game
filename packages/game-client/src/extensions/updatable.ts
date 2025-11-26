import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
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

  public deserializeFromBuffer(reader: BufferReader): this {
    // Updatable extension has no fields
    return this;
  }
}
