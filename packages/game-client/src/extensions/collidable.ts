import { ExtensionTypes } from "@server/shared/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";
import { Hitbox } from "@survive-the-night/game-server";

export class ClientCollidable implements ClientExtension {
  public static readonly type = ExtensionTypes.COLLIDABLE;

  private size = 16;
  private offset = 0;
  private enabled = true;

  public setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    return this;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setSize(size: number): this {
    this.size = size;
    return this;
  }

  public getSize(): number {
    return this.size;
  }

  public setOffset(offset: number): this {
    this.offset = offset;
    return this;
  }

  public getHitBox(): Hitbox {
    return {
      x: this.offset,
      y: this.offset,
      width: this.size,
      height: this.size,
    };
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.offset = data.offset;
    this.size = data.size;
    return this;
  }
}
