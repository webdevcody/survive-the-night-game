import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "@/extensions/types";

export class ClientDestructible implements ClientExtension {
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

  public deserialize(data: ClientExtensionSerialized): this {
    this.health = data.health;
    this.maxHealth = data.maxHealth;
    return this;
  }
}
