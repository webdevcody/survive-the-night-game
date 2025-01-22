import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import Vector2 from "@shared/util/vector2";

export class ClientInteractive extends BaseClientExtension {
  public static readonly type = ExtensionTypes.INTERACTIVE;

  private displayName = "";
  private offset: Vector2 = new Vector2(0, 0);

  public getDisplayName(): string {
    return this.displayName;
  }

  public getOffset(): Vector2 {
    return this.offset;
  }

  public setOffset(offset: Vector2): this {
    this.offset = offset;
    return this;
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.displayName = data.displayName;
    this.offset = data.offset;
    return this;
  }
}
