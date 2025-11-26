import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";
import { ClientPositionable } from "./positionable";
import { Hitbox } from "@shared/util/hitbox";

export class ClientDestructible extends BaseClientExtension {
  public static readonly type = ExtensionTypes.DESTRUCTIBLE;

  private health = 0;
  private maxHealth = 0;

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public isDead(): boolean {
    return this.health === 0;
  }

  public getDamageBox(): Hitbox {
    const positionable = this.clientEntity.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const size = positionable.getSize();
    return {
      x: position.x,
      y: position.y,
      width: size.x,
      height: size.y,
    };
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.health = reader.readUInt8();
    this.maxHealth = reader.readUInt8();
    return this;
  }
}
